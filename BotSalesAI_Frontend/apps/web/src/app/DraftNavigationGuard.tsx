import {useEffect,useId,useState} from 'react';
import {useBlocker} from 'react-router-dom';
import {Button,Dialog,DialogActions,DialogContent,DialogContentText,DialogTitle} from '@mui/material';
import {consumeFormSubmissionNavigation,flushDirtyDrafts,hasUnsavedFormDraft,observeFormSubmissions} from './dirty-drafts';
import {layoutSx} from '../shared/ui/layout';

/** One guard owner for authenticated global pages and the shop shell. */
export function DraftNavigationGuard({logoutPending=false,onCancelLogout,onDiscardLogout}:{
 logoutPending?:boolean;onCancelLogout?:()=>void;onDiscardLogout?:()=>Promise<void>;
}){
 const titleId=useId();
 const descriptionId=`${titleId}-description`;
 const [saving,setSaving]=useState(false);
 const blocker=useBlocker(({currentLocation,nextLocation})=>currentLocation.pathname!==nextLocation.pathname&&!consumeFormSubmissionNavigation()&&hasUnsavedFormDraft());
 const proceed=blocker.proceed;
 useEffect(()=>{
  if (!proceed) return;
  if (!hasUnsavedFormDraft()) {
   proceed();
   return;
  }
  const flush=flushDirtyDrafts();
  if (!flush) return;
  let active=true;
  setSaving(true);
  void flush.then(saved=>{if(active&&(saved||!hasUnsavedFormDraft()))proceed();}).catch(()=>{}).finally(()=>{if(active)setSaving(false);});
  return ()=>{active=false;setSaving(false);};
 },[proceed]);
 useEffect(()=>observeFormSubmissions(),[]);
 useEffect(()=>{const prevent=(event:BeforeUnloadEvent)=>{if(hasUnsavedFormDraft()){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);},[]);
 const keep=()=>{onCancelLogout?.();blocker.reset?.();};
 return <Dialog open={blocker.state==='blocked'||logoutPending} onClose={saving?undefined:keep} aria-labelledby={titleId} aria-describedby={descriptionId} slotProps={{paper:{sx:layoutSx.dialog.viewportMargin}}}>
  <DialogTitle id={titleId} sx={layoutSx.dialog.inset}>{saving?'Đang lưu bản đang nhập…':'Rời màn hình chưa lưu?'}</DialogTitle>
  <DialogContent tabIndex={0} role="region" aria-labelledby={titleId} sx={layoutSx.dialog.inset}><DialogContentText id={descriptionId}>{saving?'Màn hình sẽ chuyển sau khi máy chủ xác nhận lưu.':logoutPending?'Đăng xuất sẽ xóa bản nháp đang có thay đổi.':'Bản nháp đang có thay đổi. Tiếp tục chỉnh sửa hoặc rời màn hình mà không lưu.'}</DialogContentText></DialogContent>
  <DialogActions disableSpacing sx={[layoutSx.dialog.actionsInset,layoutSx.dialog.actionsGap]}><Button autoFocus disabled={saving} onClick={keep}>Tiếp tục chỉnh sửa</Button><Button variant="contained" color="warning" disabled={saving} onClick={()=>logoutPending?void onDiscardLogout?.():blocker.proceed?.()}>Rời màn hình</Button></DialogActions>
 </Dialog>;
}
