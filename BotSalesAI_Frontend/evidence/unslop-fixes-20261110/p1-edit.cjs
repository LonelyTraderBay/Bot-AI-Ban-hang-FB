const fs = require('node:fs');
function edit(file, replacements) {
  let s = fs.readFileSync(file, 'utf8');
  for (const [before, after] of replacements) {
    if (s.split(before).length !== 2) throw new Error(`Expected exactly one match in ${file}: ${before}`);
    s = s.replace(before, after);
  }
  fs.writeFileSync(file, s);
}
edit('apps/web/src/modules/catalog/imports.tsx', [
  ["import { useState } from 'react';", "import { useRef, useState } from 'react';"],
  ["    const [file, setFile] = useState<File | null>(null);", "    const fileInput = useRef<HTMLInputElement>(null);\n    const [file, setFile] = useState<File | null>(null);"],
  ['<Button variant="outlined" component="label">', '<Button variant="outlined" onClick={() => fileInput.current?.click()}>'],
  ["{file ? file.name : 'Chọn CSV UTF-8'}\r\n                        <input hidden", "{file ? file.name : 'Chọn CSV UTF-8'}\r\n                    </Button>\r\n                        <input ref={fileInput} hidden"],
  ['                        }} />\r\n                    </Button>', '                        }} />']
]);
edit('apps/web/src/modules/catalog/index.tsx', [
  ['    const productElement = useRef<HTMLFormElement>(null);', '    const productElement = useRef<HTMLFormElement>(null);\n    const imageInput = useRef<HTMLInputElement>(null);'],
  ['<Button component="label" variant="outlined" disabled={!canWrite || pending}>Chọn ảnh<input hidden', '<Button type="button" variant="outlined" disabled={!canWrite || pending} onClick={() => imageInput.current?.click()}>Chọn ảnh</Button><input ref={imageInput} hidden'],
  ["catch { /* visible error */ } input.value = ''; }}/></Button>{imageError", "catch { /* visible error */ } input.value = ''; }}/>{imageError"]
]);
edit('apps/web/src/modules/knowledge/index.tsx', [
  ["import { useState } from 'react';", "import { useRef, useState } from 'react';"],
  ['export function KnowledgePage() {', 'export function KnowledgePage() {\n    const fileInput = useRef<HTMLInputElement>(null);'],
  ['<Button component="label" variant="outlined">{file ? file.name : \'Hoặc tải PDF/tài liệu hỗ trợ\'}<input type="file" hidden', '<Button variant="outlined" onClick={() => fileInput.current?.click()}>{file ? file.name : \'Hoặc tải PDF/tài liệu hỗ trợ\'}</Button><input ref={fileInput} type="file" hidden'],
  ['setFile(next); }}/></Button>{file &&', 'setFile(next); }}/>{file &&'],
  ["setFile(null); setFileError(''); setUploadedFileId(null); }}>Bỏ tệp", "setFile(null); setFileError(''); setUploadedFileId(null); if (fileInput.current) fileInput.current.value = ''; }}>Bỏ tệp"]
]);
