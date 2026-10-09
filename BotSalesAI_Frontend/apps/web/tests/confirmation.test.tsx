import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {ThemeProvider} from '@mui/material';
import {ConfirmDialog} from '../src/shared/ui/components';
import {theme} from '../src/shared/ui/theme';
afterEach(cleanup);
describe('UX03 shared confirmation',()=>{
 it('keeps compatible default and supports an explicit business verb',()=>{
  const props={open:true,title:'Ngừng dùng',description:'Danh mục Quần (cat-1): ngừng dùng mới, giữ lịch sử.',onClose:vi.fn(),onConfirm:vi.fn().mockResolvedValue({})};
  const view=render(<ThemeProvider theme={theme}><ConfirmDialog {...props}/></ThemeProvider>);
  expect(screen.getByRole('button',{name:'Xác nhận',exact:true})).toBeEnabled();
  view.rerender(<ThemeProvider theme={theme}><ConfirmDialog {...props} confirmLabel="Ngừng dùng danh mục"/></ThemeProvider>);
  expect(screen.getByRole('button',{name:'Ngừng dùng danh mục',exact:true})).toBeEnabled();
  expect(screen.getByRole('dialog',{name:'Ngừng dùng'})).toHaveTextContent('Quần (cat-1)');
 });
 it('locks duplicate requests and close while pending, then closes only on acknowledgement',async()=>{
  let settle!:()=>void;
  const confirm=vi.fn(()=>new Promise<void>(resolve=>{settle=resolve;}));const close=vi.fn();
  render(<ThemeProvider theme={theme}><ConfirmDialog open title="Ghi sổ" description="Bút toán j1" confirmLabel="Ghi sổ bút toán" onClose={close} onConfirm={confirm}/></ThemeProvider>);
  const button=screen.getByRole('button',{name:'Ghi sổ bút toán'});
  fireEvent.click(button);fireEvent.click(button);
  expect(confirm).toHaveBeenCalledTimes(1);expect(button).toBeDisabled();
  fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});expect(close).not.toHaveBeenCalled();
  settle();await waitFor(()=>expect(close).toHaveBeenCalledTimes(1));
 });
 it('keeps the reason and exposes a rejected request even without a caller error prop',async()=>{
  const close=vi.fn();const confirm=vi.fn().mockRejectedValue(new Error('Phiên bản đã thay đổi.'));
  render(<ThemeProvider theme={theme}><ConfirmDialog open title="Hủy đơn" description="Đơn DH1" confirmLabel="Hủy đơn hàng" requireReason onClose={close} onConfirm={confirm}/></ThemeProvider>);
  const button=screen.getByRole('button',{name:'Hủy đơn hàng'});
  expect(button).toBeDisabled();fireEvent.change(screen.getByRole('textbox'),{target:{value:'Khách yêu cầu hủy'}});
  fireEvent.click(button);await screen.findByText('Phiên bản đã thay đổi.');
  expect(close).not.toHaveBeenCalled();expect(screen.getByRole('textbox')).toHaveValue('Khách yêu cầu hủy');
 });
 it('a late acknowledgement cannot close a different confirmation',async()=>{
  let settle!:()=>void;const close=vi.fn();const confirm=()=>new Promise<void>(resolve=>{settle=resolve;});
  const view=render(<ThemeProvider theme={theme}><ConfirmDialog open title="Đối tượng cũ" description="c1" onClose={close} onConfirm={confirm}/></ThemeProvider>);
  fireEvent.click(screen.getByRole('button',{name:'Xác nhận'}));
  view.rerender(<ThemeProvider theme={theme}><ConfirmDialog open={false} title="Đối tượng cũ" description="c1" onClose={close} onConfirm={confirm}/></ThemeProvider>);
  view.rerender(<ThemeProvider theme={theme}><ConfirmDialog open title="Đối tượng mới" description="c2" onClose={close} onConfirm={confirm}/></ThemeProvider>);
  settle();await waitFor(()=>expect(screen.getByRole('dialog',{name:'Đối tượng mới'})).toBeVisible());expect(close).not.toHaveBeenCalled();
 });
});
