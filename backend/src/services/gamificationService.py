def calculate_commission(sales_count):
    if sales_count < 24:
        return 4.5
    elif sales_count < 74:
        return 4.35
    elif sales_count < 226:
        return 4.2
    elif sales_count < 551:
        return 4.05
    elif sales_count < 1001:
        return 3.9
    elif sales_count < 2850:
        return 3.75
    else:
        return 3.6
