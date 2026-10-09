import { describe, expect, it } from 'vitest';
import { PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMPORT_MAX_BYTES, productImageFileError, productImportFileError } from '../src/modules/catalog/import-file';

describe('catalog import file boundary', () => {
  it('requires the advertised CSV extension', () => {
    expect(productImportFileError({ name: 'products.xlsx', size: 10 }, PRODUCT_IMPORT_MAX_BYTES))
      .toContain('.csv');
    expect(productImportFileError({ name: 'products.csv', size: 10 }, PRODUCT_IMPORT_MAX_BYTES)).toBe('');
  });

  it('rejects files over the demo limit before upload', () => {
    expect(productImportFileError({ name: 'products.csv', size: PRODUCT_IMPORT_MAX_BYTES + 1 }, PRODUCT_IMPORT_MAX_BYTES))
      .toContain('5 MB');
  });

  it('leaves live size limits to the API contract', () => {
    expect(productImportFileError({ name: 'large.csv', size: 100 * 1024 * 1024 })).toBe('');
  });
});

describe('product image file boundary', () => {
  it('allows supported images and rejects other media types', () => {
    expect(productImageFileError({ type: 'image/webp', size: 10 }, PRODUCT_IMAGE_MAX_BYTES)).toBe('');
    expect(productImageFileError({ type: 'image/svg+xml', size: 10 }, PRODUCT_IMAGE_MAX_BYTES)).toContain('PNG, JPEG hoặc WebP');
  });

  it('rejects images above the demo upload limit', () => {
    expect(productImageFileError({ type: 'image/png', size: PRODUCT_IMAGE_MAX_BYTES + 1 }, PRODUCT_IMAGE_MAX_BYTES)).toContain('5 MB');
  });
});
