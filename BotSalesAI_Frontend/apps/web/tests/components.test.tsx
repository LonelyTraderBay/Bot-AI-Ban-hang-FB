import {describe,it,expect} from 'vitest';
import {render,screen} from '@testing-library/react';
import {ThemeProvider} from '@mui/material';
import {MemoryRouter} from 'react-router-dom';
import {theme} from '../src/shared/ui/theme';
import {DataTable,Status,ErrorNotice} from '../src/shared/ui/components';
import {UnknownResultError} from '../src/shared/api/errors';
describe('Accessible shared presentation',()=>{
 it('renders status as text, not color only',()=>{render(<ThemeProvider theme={theme}><Status value="unknown"/></ThemeProvider>);expect(screen.getByText(/chưa rõ/i)).toBeInTheDocument();});
 it('renders one named table and stable data',()=>{render(<ThemeProvider theme={theme}><MemoryRouter><DataTable rows={[{id:'1',name:'Sản phẩm mẫu'}]} rowKey={r=>r.id} columns={[{key:'name',label:'Tên',render:r=>r.name}]} label="Sản phẩm"/></MemoryRouter></ThemeProvider>);expect(screen.getByText('Sản phẩm mẫu')).toBeInTheDocument();expect(screen.getByRole('columnheader')).toHaveTextContent('Tên');});
 it('states unknown command result without success message',()=>{render(<ErrorNotice error={new UnknownResultError('intent-1','command-1')}/>);expect(screen.getByRole('alert')).toHaveTextContent('command-1');});
});
