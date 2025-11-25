#!/bin/bash

# Script de configuration de l'environnement de développement Tradefy
# Usage: ./scripts/setup-dev.sh

set -e  # Arrêter le script en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions d'affichage
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier que le script est exécuté depuis la racine du projet
check_root_directory() {
    if [[ ! -f "composer.json" ]]; then
        print_error "Veuillez exécuter ce script depuis la racine du projet Tradefy"
        exit 1
    fi
    print_success "Répertoire racine détecté"
}

# Vérifier les prérequis système
check_prerequisites() {
    print_info "Vérification des prérequis système..."
    
    # Vérifier PHP
    if command -v php >/dev/null 2>&1; then
        PHP_VERSION=$(php -r "echo PHP_VERSION;")
        print_success "PHP trouvé: $PHP_VERSION"
        
        # Vérifier la version PHP
        REQUIRED_PHP="8.1.0"
        if php -r "exit(version_compare(PHP_VERSION, '$REQUIRED_PHP', '<'));"; then
            print_success "Version PHP compatible: $REQUIRED_PHP+"
        else
            print_error "PHP $REQUIRED_PHP+ requis. Version actuelle: $PHP_VERSION"
            exit 1
        fi
    else
        print_error "PHP n'est pas installé"
        exit 1
    fi
    
    # Vérifier Composer
    if command -v composer >/dev/null 2>&1; then
        COMPOSER_VERSION=$(composer --version | cut -d' ' -f3)
        print_success "Composer trouvé: $COMPOSER_VERSION"
    else
        print_error "Composer n'est pas installé"
        print_info "Installation de Composer..."
        php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
        php composer-setup.php
        php -r "unlink('composer-setup.php');"
        sudo mv composer.phar /usr/local/bin/composer
        print_success "Composer installé"
    fi
    
    # Vérifier PostgreSQL
    if command -v psql >/dev/null 2>&1; then
        POSTGRES_VERSION=$(psql --version | cut -d' ' -f3)
        print_success "PostgreSQL trouvé: $POSTGRES_VERSION"
    else
        print_warning "PostgreSQL n'est pas installé"
        print_info "Veuillez installer PostgreSQL manuellement:"
        print_info "Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
        print_info "macOS: brew install postgresql"
        print_info "Windows: https://www.postgresql.org/download/windows/"
    fi
    
    # Vérifier Node.js (optionnel pour le frontend)
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        print_success "Node.js trouvé: $NODE_VERSION"
    else
        print_warning "Node.js n'est pas installé (optionnel pour le développement frontend)"
    fi
}

# Copier le fichier d'environnement
setup_environment() {
    print_info "Configuration de l'environnement..."
    
    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.example" ]]; then
            cp .env.example .env
            print_success "Fichier .env créé à partir de .env.example"
        else
            print_error "Fichier .env.example non trouvé"
            exit 1
        fi
    else
        print_warning "Fichier .env existe déjà - conservation des paramètres actuels"
    fi
    
    # Générer une clé JWT si elle n'existe pas
    if grep -q "JWT_SECRET=your-super-secret-jwt-key-here" .env; then
        JWT_SECRET=$(openssl rand -base64 32)
        sed -i.bak "s|JWT_SECRET=your-super-secret-jwt-key-here|JWT_SECRET=$JWT_SECRET|" .env
        rm -f .env.bak
        print_success "Clé JWT secrète générée"
    fi
    
    # Définir l'environnement de développement
    sed -i.bak "s|APP_ENV=production|APP_ENV=development|" .env
    sed -i.bak "s|APP_DEBUG=false|APP_DEBUG=true|" .env
    rm -f .env.bak
    
    print_success "Environnement configuré pour le développement"
}

# Installer les dépendances PHP
install_php_dependencies() {
    print_info "Installation des dépendances PHP..."
    
    composer install --optimize-autoloader
    
    if [[ $? -eq 0 ]]; then
        print_success "Dépendances PHP installées"
    else
        print_error "Échec de l'installation des dépendances PHP"
        exit 1
    fi
}

# Configurer la base de données
setup_database() {
    print_info "Configuration de la base de données..."
    
    # Vérifier si la base de données existe
    if command -v psql >/dev/null 2>&1; then
        # Essayer de se connecter à la base
        if php -r "
        require_once 'vendor/autoload.php';
        \Tradefy\Config\Settings::initialize();
        \$dbConfig = \Tradefy\Config\Settings::getDatabaseConfig();
        \$dsn = \Tradefy\Config\Settings::getDatabaseDSN();
        try {
            \$db = new PDO(\$dsn, \$dbConfig['user'], \$dbConfig['password']);
            echo 'connected';
        } catch (Exception \$e) {
            echo 'error';
        }
        " | grep -q "connected"; then
            print_success "Connexion à la base de données établie"
        else
            print_warning "Impossible de se connecter à la base de données"
            print_info "Veuillez configurer manuellement votre base de données PostgreSQL:"
            print_info "1. Créer une base de données: createdb tradefy"
            print_info "2. Vérifier les paramètres dans .env"
            print_info "3. Relancer ce script"
            exit 1
        fi
    else
        print_warning "PostgreSQL non détecté - configuration manuelle requise"
    fi
}

# Exécuter les migrations
run_migrations() {
    print_info "Exécution des migrations de base de données..."
    
    if php scripts/migrate.php status > /dev/null 2>&1; then
        php scripts/migrate.php migrate
        
        if [[ $? -eq 0 ]]; then
            print_success "Migrations de base de données exécutées"
        else
            print_error "Échec des migrations de base de données"
            exit 1
        fi
    else
        print_warning "Impossible d'exécuter les migrations - vérifiez la configuration de la base"
    fi
}

# Vérifier l'environnement
check_environment() {
    print_info "Vérification finale de l'environnement..."
    
    php scripts/check-env.php
    
    if [[ $? -eq 0 ]]; then
        print_success "Environnement vérifié avec succès"
    else
        print_warning "Problèmes détectés dans l'environnement - vérifiez les avertissements ci-dessus"
    fi
}

# Exécuter les tests
run_tests() {
    print_info "Exécution des tests..."
    
    if composer test > /dev/null 2>&1; then
        print_success "Tests passés avec succès"
    else
        print_warning "Certains tests ont échoué - vérifiez les détails ci-dessus"
    fi
}

# Configurer les hooks Git (optionnel)
setup_git_hooks() {
    print_info "Configuration des hooks Git..."
    
    if [[ -d ".git" ]]; then
        # Créer un pre-commit hook simple
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "🔍 Exécution des vérifications pré-commit..."

# Vérifier la syntaxe PHP
echo "• Vérification de la syntaxe PHP..."
find src/ -name "*.php" -exec php -l {} \; | grep -v "No syntax errors"

# Exécuter les tests unitaires
echo "• Exécution des tests unitaires..."
composer test

# Vérifier le style de code
echo "• Vérification du style de code..."
composer lint
EOF
        
        chmod +x .git/hooks/pre-commit
        print_success "Hook Git pre-commit configuré"
    else
        print_warning "Dépôt Git non trouvé - hooks non configurés"
    fi
}

# Afficher les informations de fin
show_completion() {
    echo ""
    print_success "Configuration du développement Tradefy terminée!"
    echo ""
    print_info "Prochaines étapes:"
    echo "  1. Vérifiez la configuration dans le fichier .env"
    echo "  2. Démarrez le serveur de développement: php -S localhost:8000 -t public"
    echo "  3. Accédez à l'API: http://localhost:8000/api/health"
    echo ""
    print_info "Commandes utiles:"
    echo "  • composer test          - Exécuter les tests"
    echo "  • composer lint          - Vérifier le style de code"
    echo "  • php scripts/migrate.php migrate  - Nouvelles migrations"
    echo "  • php scripts/check-env.php        - Vérifier l'environnement"
    echo ""
    print_warning "N'oubliez pas de configurer vos services externes:"
    echo "  • Supabase: https://supabase.com"
    echo "  • Moneroo: https://moneroo.io"
    echo ""
}

# Fonction principale
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                   TRAdefY v3 - SETUP DEV                    ║"
    echo "║               Configuration de l'environnement              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_root_directory
    check_prerequisites
    setup_environment
    install_php_dependencies
    setup_database
    run_migrations
    check_environment
    run_tests
    setup_git_hooks
    show_completion
}

# Gestion des arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: ./scripts/setup-dev.sh [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  -h, --help    Afficher cette aide"
        echo "  --skip-tests  Sauter l'exécution des tests"
        echo "  --minimal     Installation minimale (dépendances seulement)"
        echo ""
        exit 0
        ;;
    --skip-tests)
        run_tests() {
            print_warning "Tests ignorés (option --skip-tests)"
        }
        ;;
    --minimal)
        run_tests() {
            print_warning "Tests ignorés (mode minimal)"
        }
        setup_git_hooks() {
            print_warning "Hooks Git ignorés (mode minimal)"
        }
        ;;
esac

# Exécuter la fonction principale
main