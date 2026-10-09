import {useEffect,useId} from 'react';
import {useBlocker} from 'react-router-dom';
import {Button,Dialog,DialogActions,DialogContent,DialogContentText,DialogTitle} from '@mui/material';
import {consumeFormSubmissionNavigation,hasUnsavedFormDraft,observeFormSubmissions} from './dirty-drafts';
import {layoutSx} from '../shared/ui/layout';

/** One guard owner for authenticated global pages and the shop shell. */
export function DraftNavigationGuard({logoutPending=false,onCancelLogout,onDiscardLogout}:{
 logoutPending?:boolean;onCancelLogout?:()=>void;onDiscardLogout?:()=>Promise<void>;
}){
 const titleId=useId();
 const blocker=useBlocker(({currentLocation,nextLocation})=>currentLocation.pathname!==nextLocation.pathname&&!consumeFormSubmissionNavigation()&&hasUnsavedFormDraft());
 useEffect(()=>observeFormSubmissions(),[]);
 useEffect(()=>{const prevent=(event:BeforeUnloadEvent)=>{if(hasUnsavedFormDraft()){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);},[]);
 const keep=()=>{onCancelLogout?.();blocker.reset?.();};
 return <Dialog open={blocker.state==='blocked'||logoutPending} onClose={keep} aria-labelledby={titleId} slotProps={{paper:{sx:layoutSx.dialog.viewportMargin}}}>
  <DialogTitle id={titleId} sx={layoutSx.dialog.inset}>Rời màn hình chưa lưu?</DialogTitle>
  <DialogContent sx={layoutSx.dialog.inset}><DialogContentText>{logoutPending?'Đăng xuất sẽ xóa bản nháp đang có thay đổi.':'Bản nháp đang có thay đổi. Tiếp tục chỉnh sửa hoặc rời màn hình mà không lưu.'}</DialogContentText></DialogContent>
  <DialogActions disableSpacing sx={[layoutSx.dialog.actionsInset,layoutSx.dialog.actionsGap]}><Button autoFocus onClick={keep}>Tiếp tục chỉnh sửa</Button><Button variant="contained" color="warning" onClick={()=>logoutPending?void onDiscardLogout?.():blocker.proceed?.()}>Rời màn hình</Button></DialogActions>
 </Dialog>;
}
