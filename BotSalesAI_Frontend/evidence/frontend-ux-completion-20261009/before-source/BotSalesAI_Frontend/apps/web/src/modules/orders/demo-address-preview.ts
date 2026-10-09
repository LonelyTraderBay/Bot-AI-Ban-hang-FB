export type DemoAddressOption = {
    id: string;
    label: string;
};

const addressesByShop: Record<string, DemoAddressOption[]> = {
    'shop-demo': [{ id: 'address-synthetic', label: 'Địa chỉ mẫu · shop-demo (chỉ dùng trong demo)' }],
    'shop-second': [{ id: 'b-address-synthetic', label: 'Địa chỉ mẫu · shop-second (chỉ dùng trong demo)' }],
};

export function getDemoAddressOptions(shopId: string): DemoAddressOption[] {
    return addressesByShop[shopId] || [];
}
