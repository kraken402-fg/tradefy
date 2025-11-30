const { config, getSupabaseConfig } = require('../config/platforms');

class SupabaseService {
    constructor() {
        this.config = getSupabaseConfig();
        this.url = this.config.url;
        this.key = this.config.key;
        this.secret = this.config.secret;
        this.bucket = this.config.bucket;
    }

    /**
     * Uploader un fichier sur Supabase Storage
     */
    async uploadFile(file, path, options = {}) {
        try {
            const axios = require('axios');
            
            // Construire l'URL d'upload
            const uploadURL = `${this.url}/storage/v1/object/${this.bucket}/${path}`;
            
            // Préparer les headers
            const headers = {
                'Authorization': `Bearer ${this.secret}`,
                'Content-Type': file.mimetype || 'application/octet-stream'
            };

            // Ajouter les options de transformation si spécifiées
            if (options.transform) {
                headers['x-upsert'] = 'true';
            }

            // Uploader le fichier
            const response = await axios.post(uploadURL, file.buffer, {
                headers: headers,
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });

            // Construire l'URL publique
            const publicURL = `${this.url}/storage/v1/object/public/${this.bucket}/${path}`;

            return {
                success: true,
                data: {
                    path: path,
                    publicURL: publicURL,
                    size: file.size,
                    mimetype: file.mimetype,
                    uploadedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error('Supabase upload error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de l\'upload sur Supabase',
                    details: error.response?.data?.message || error.message
                }
            };
        }
    }

    /**
     * Supprimer un fichier de Supabase Storage
     */
    async deleteFile(path) {
        try {
            const axios = require('axios');
            
            const deleteURL = `${this.url}/storage/v1/object/${this.bucket}/${path}`;
            
            const headers = {
                'Authorization': `Bearer ${this.secret}`
            };

            await axios.delete(deleteURL, { headers });

            return {
                success: true,
                message: 'Fichier supprimé avec succès'
            };

        } catch (error) {
            console.error('Supabase delete error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de la suppression du fichier',
                    details: error.response?.data?.message || error.message
                }
            };
        }
    }

    /**
     * Obtenir un fichier de Supabase Storage
     */
    async getFile(path) {
        try {
            const axios = require('axios');
            
            const fileURL = `${this.url}/storage/v1/object/${this.bucket}/${path}`;
            
            const headers = {
                'Authorization': `Bearer ${this.key}`
            };

            const response = await axios.get(fileURL, { 
                headers,
                responseType: 'arraybuffer'
            });

            return {
                success: true,
                data: {
                    buffer: response.data,
                    contentType: response.headers['content-type'],
                    size: response.data.byteLength
                }
            };

        } catch (error) {
            console.error('Supabase get file error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de la récupération du fichier',
                    details: error.response?.data?.message || error.message
                }
            };
        }
    }

    /**
     * Lister les fichiers dans un dossier
     */
    async listFiles(folder = '', options = {}) {
        try {
            const axios = require('axios');
            
            const listURL = `${this.url}/storage/v1/object/${this.bucket}/${folder}`;
            
            const headers = {
                'Authorization': `Bearer ${this.secret}`
            };

            const params = {};
            if (options.limit) params.limit = options.limit;
            if (options.offset) params.offset = options.offset;
            if (options.search) params.search = options.search;

            const response = await axios.get(listURL, { 
                headers,
                params
            });

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('Supabase list files error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de la liste des fichiers',
                    details: error.response?.data?.message || error.message
                }
            };
        }
    }

    /**
     * Uploader une image de produit
     */
    async uploadProductImage(file, productId, isMain = false) {
        try {
            // Valider le fichier
            const validation = this.validateImageFile(file);
            if (!validation.valid) {
                return {
                    success: false,
                    error: {
                        message: validation.message
                    }
                };
            }

            // Générer un nom de fichier sécurisé
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 15);
            const filename = `products/${productId}/${timestamp}_${random}_${file.originalname}`;
            
            // Uploader le fichier
            const uploadResult = await this.uploadFile(file, filename);
            
            if (!uploadResult.success) {
                return uploadResult;
            }

            // Si c'est l'image principale, la marquer comme telle
            if (isMain) {
                // TODO: Mettre à jour la base de données pour marquer comme image principale
            }

            return {
                success: true,
                data: {
                    url: uploadResult.data.publicURL,
                    path: uploadResult.data.path,
                    size: uploadResult.data.size,
                    isMain: isMain
                }
            };

        } catch (error) {
            console.error('Upload product image error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de l\'upload de l\'image produit',
                    details: error.message
                }
            };
        }
    }

    /**
     * Supprimer une image de produit
     */
    async deleteProductImage(imagePath) {
        try {
            const deleteResult = await this.deleteFile(imagePath);
            
            if (!deleteResult.success) {
                return deleteResult;
            }

            // TODO: Mettre à jour la base de données pour supprimer la référence

            return {
                success: true,
                message: 'Image de produit supprimée avec succès'
            };

        } catch (error) {
            console.error('Delete product image error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de la suppression de l\'image produit',
                    details: error.message
                }
            };
        }
    }

    /**
     * Uploader l'avatar d'un utilisateur
     */
    async uploadUserAvatar(file, userId) {
        try {
            // Valider le fichier
            const validation = this.validateImageFile(file);
            if (!validation.valid) {
                return {
                    success: false,
                    error: {
                        message: validation.message
                    }
                };
            }

            // Générer un nom de fichier sécurisé
            const timestamp = Date.now();
            const filename = `avatars/${userId}/avatar_${timestamp}_${file.originalname}`;
            
            // Uploader le fichier
            const uploadResult = await this.uploadFile(file, filename);
            
            if (!uploadResult.success) {
                return uploadResult;
            }

            return {
                success: true,
                data: {
                    url: uploadResult.data.publicURL,
                    path: uploadResult.data.path,
                    size: uploadResult.data.size
                }
            };

        } catch (error) {
            console.error('Upload user avatar error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de l\'upload de l\'avatar',
                    details: error.message
                }
            };
        }
    }

    /**
     * Uploader un document (PDF, etc.)
     */
    async uploadDocument(file, documentType, referenceId) {
        try {
            // Valider le fichier
            const validation = this.validateDocumentFile(file);
            if (!validation.valid) {
                return {
                    success: false,
                    error: {
                        message: validation.message
                    }
                };
            }

            // Générer un nom de fichier sécurisé
            const timestamp = Date.now();
            const filename = `documents/${documentType}/${referenceId}/${timestamp}_${file.originalname}`;
            
            // Uploader le fichier
            const uploadResult = await this.uploadFile(file, filename);
            
            if (!uploadResult.success) {
                return uploadResult;
            }

            return {
                success: true,
                data: {
                    url: uploadResult.data.publicURL,
                    path: uploadResult.data.path,
                    size: uploadResult.data.size,
                    type: documentType
                }
            };

        } catch (error) {
            console.error('Upload document error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de l\'upload du document',
                    details: error.message
                }
            };
        }
    }

    /**
     * Créer une URL signée temporaire
     */
    async createSignedUrl(path, expiresIn = 3600) {
        try {
            const axios = require('axios');
            
            const signURL = `${this.url}/storage/v1/object/sign/${this.bucket}/${path}`;
            
            const headers = {
                'Authorization': `Bearer ${this.secret}`,
                'Content-Type': 'application/json'
            };

            const payload = {
                expiresIn: expiresIn
            };

            const response = await axios.post(signURL, payload, { headers });

            return {
                success: true,
                data: {
                    signedURL: response.data.signedURL,
                    expiresIn: expiresIn
                }
            };

        } catch (error) {
            console.error('Create signed URL error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de la création de l\'URL signée',
                    details: error.response?.data?.message || error.message
                }
            };
        }
    }

    /**
     * Obtenir les métadonnées d'un fichier
     */
    async getFileMetadata(path) {
        try {
            const axios = require('axios');
            
            const metadataURL = `${this.url}/storage/v1/object/${this.bucket}/${path}/metadata`;
            
            const headers = {
                'Authorization': `Bearer ${this.secret}`
            };

            const response = await axios.get(metadataURL, { headers });

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('Get file metadata error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de la récupération des métadonnées',
                    details: error.response?.data?.message || error.message
                }
            };
        }
    }

    // ====================
    // 🔧 MÉTHODES PRIVÉES
    // ====================

    /**
     * Valider un fichier image
     */
    validateImageFile(file) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.mimetype)) {
            return {
                valid: false,
                message: 'Type de fichier non autorisé. Utilisez JPEG, PNG, WebP ou GIF'
            };
        }

        if (file.size > maxSize) {
            return {
                valid: false,
                message: 'Fichier trop volumineux. Maximum 5MB'
            };
        }

        return { valid: true };
    }

    /**
     * Valider un fichier document
     */
    validateDocumentFile(file) {
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowedTypes.includes(file.mimetype)) {
            return {
                valid: false,
                message: 'Type de fichier non autorisé. Utilisez PDF ou Word'
            };
        }

        if (file.size > maxSize) {
            return {
                valid: false,
                message: 'Fichier trop volumineux. Maximum 10MB'
            };
        }

        return { valid: true };
    }

    /**
     * Optimiser une image avant upload
     */
    async optimizeImage(buffer, mimetype) {
        try {
            const sharp = require('sharp');
            
            let image = sharp(buffer);
            
            // Convertir en WebP pour une meilleure compression
            if (mimetype !== 'image/gif') {
                image = image.webp({ quality: 80 });
            }

            // Redimensionner si trop grand
            image = image.resize({
                width: 1920,
                height: 1080,
                fit: 'inside',
                withoutEnlargement: true
            });

            const optimizedBuffer = await image.toBuffer();

            return {
                buffer: optimizedBuffer,
                mimetype: 'image/webp',
                size: optimizedBuffer.length
            };

        } catch (error) {
            console.error('Image optimization error:', error);
            // Retourner l'image originale si l'optimisation échoue
            return {
                buffer: buffer,
                mimetype: mimetype,
                size: buffer.length
            };
        }
    }

    /**
     * Générer des thumbnails
     */
    async generateThumbnail(buffer, size = { width: 300, height: 300 }) {
        try {
            const sharp = require('sharp');
            
            const thumbnail = await sharp(buffer)
                .resize(size.width, size.height, {
                    fit: 'cover',
                    position: 'center'
                })
                .webp({ quality: 70 })
                .toBuffer();

            return {
                buffer: thumbnail,
                mimetype: 'image/webp'
            };

        } catch (error) {
            console.error('Thumbnail generation error:', error);
            throw new Error('Échec de la génération du thumbnail');
        }
    }

    /**
     * Vérifier si un fichier existe
     */
    async fileExists(path) {
        try {
            const result = await this.getFileMetadata(path);
            return result.success;
        } catch {
            return false;
        }
    }

    /**
     * Obtenir les statistiques de stockage
     */
    async getStorageStats() {
        try {
            const axios = require('axios');
            
            const statsURL = `${this.url}/storage/v1/bucket/${this.bucket}`;
            
            const headers = {
                'Authorization': `Bearer ${this.secret}`
            };

            const response = await axios.get(statsURL, { headers });

            return {
                success: true,
                data: {
                    size: response.data.size,
                    fileCount: response.data.fileCount,
                    lastModified: response.data.lastModified
                }
            };

        } catch (error) {
            console.error('Get storage stats error:', error);
            return {
                success: false,
                error: {
                    message: 'Échec de la récupération des statistiques',
                    details: error.response?.data?.message || error.message
                }
            };
        }
    }
}

module.exports = SupabaseService;
