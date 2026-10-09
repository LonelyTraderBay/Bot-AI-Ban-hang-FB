import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/modules/inbox/index.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-90992-a38d2d9e-fc8a-4f0f-a010-8fb64b6607d4/deps/react_jsx-dev-runtime.js?v=f1f6fcd8"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
let prevRefreshReg;
let prevRefreshSig;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$(), _s2 = $RefreshSig$(), _s3 = $RefreshSig$(), _s4 = $RefreshSig$(), _s5 = $RefreshSig$();
import { ActionGroup, FieldGroup, FormFields, SectionGrid, SurfaceContent } from "/src/shared/ui/composition.tsx";
import __vite__cjsImport4_react from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-90992-a38d2d9e-fc8a-4f0f-a010-8fb64b6607d4/deps/react.js?v=f1f6fcd8"; const useEffect = __vite__cjsImport4_react["useEffect"]; const useRef = __vite__cjsImport4_react["useRef"]; const useState = __vite__cjsImport4_react["useState"];
import { visualSx } from "/src/shared/ui/visual.ts";
import { Link as RouterLink, useParams, useSearchParams } from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-90992-a38d2d9e-fc8a-4f0f-a010-8fb64b6607d4/deps/react-router-dom.js?v=6a7a59c0";
import { Alert, Avatar, Box, Button, List, ListItem, ListItemButton, MenuItem, Stack, Tab, Tabs, TextField, Typography } from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-90992-a38d2d9e-fc8a-4f0f-a010-8fb64b6607d4/deps/@mui_material.js?v=a3a8df36";
import ArrowBackRounded from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-90992-a38d2d9e-fc8a-4f0f-a010-8fb64b6607d4/deps/@mui_icons-material_ArrowBackRounded.js?v=84b77379";
import { colors, tokens } from "/@fs/C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/packages/design-tokens/src/index.ts";
import { useApi, useCommand } from "/src/shared/api/hooks.ts";
import { useScope, useCan } from "/src/shared/model/scope.tsx";
import { dateTime } from "/src/shared/model/format.ts";
import { PageHeader, Panel, QueryState, Toolbar, Pager, Status, MutationButton, EditDialog, ErrorNotice, ConfirmDialog, RouteLink, Empty, DataTable, Amount } from "/src/shared/ui/components.tsx";
import { layoutSx } from "/src/shared/ui/layout.ts";
import { ConversationComposer, ConversationContextPanel, ConversationMessageList } from "/src/modules/inbox/conversation-components.tsx";
export function InboxPage() {
  _s();
  const { conversationId } = useParams();
  const { shop } = useScope();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const rawMode = params.get("mode");
  const mode = ["bot", "human", "paused"].find((value) => value === rawMode);
  const status = ["open", "resolved"].find((value) => value === params.get("status"));
  const channelId = params.get("channelId") || void 0;
  const assignedUserId = params.get("assignedUserId") || void 0;
  const listCursorParam = conversationId ? "listCursor" : "cursor";
  const cursor = params.get(listCursorParam) || void 0;
  const metadata = useApi("getInboxMetadata");
  const list = useApi("listConversations", { query: { q: q || void 0, status, mode, channelId, assignedUserId, cursor, limit: 40 } });
  const updateFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value)
      next.set(key, value);
    else
      next.delete(key);
    next.delete(listCursorParam);
    setParams(next);
  };
  const detailHref = (id) => {
    const next = new URLSearchParams(params);
    const listCursor = next.get(listCursorParam);
    next.delete("cursor");
    next.delete("listCursor");
    if (listCursor)
      next.set("listCursor", listCursor);
    const query = next.toString();
    return `/s/${shop.id}/inbox/${id}${query ? `?${query}` : ""}`;
  };
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV(PageHeader, { title: "Hộp thư khách hàng", subtitle: "AI và nhân viên tiếp quản rõ ràng; chỉ gửi khi chính sách kênh cho phép." }, void 0, false, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 68,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV(SectionGrid, { columns: { xs: "1fr", lg: "300px minmax(0,1fr)" }, geometry: { minHeight: 650 }, children: [
      /* @__PURE__ */ jsxDEV(Panel, { geometry: { display: { xs: conversationId ? "none" : "block", lg: "block" } }, children: [
        /* @__PURE__ */ jsxDEV(Toolbar, { operation: "listConversations", placeholder: "Tìm hội thoại…", cursorParam: listCursorParam, filters: /* @__PURE__ */ jsxDEV(FieldGroup, { direction: { xs: "column", sm: "row" }, flexWrap: "wrap", role: "group", "aria-label": "Bộ lọc hội thoại", children: [
          /* @__PURE__ */ jsxDEV(TextField, { select: true, size: "small", label: "Trạng thái", value: status || "", onChange: (event) => updateFilter("status", event.target.value), sx: { flex: 1, minWidth: 140 }, children: [
            /* @__PURE__ */ jsxDEV(MenuItem, { value: "", children: "Tất cả trạng thái" }, void 0, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 74,
              columnNumber: 25
            }, this),
            /* @__PURE__ */ jsxDEV(MenuItem, { value: "open", children: "Đang mở" }, void 0, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 74,
              columnNumber: 72
            }, this),
            /* @__PURE__ */ jsxDEV(MenuItem, { value: "resolved", children: "Đã giải quyết" }, void 0, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 74,
              columnNumber: 113
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 73,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV(TextField, { select: true, size: "small", label: "Chế độ", value: mode || "", onChange: (event) => updateFilter("mode", event.target.value), sx: { flex: 1, minWidth: 140 }, children: [
            /* @__PURE__ */ jsxDEV(MenuItem, { value: "", children: "Tất cả chế độ" }, void 0, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 77,
              columnNumber: 25
            }, this),
            /* @__PURE__ */ jsxDEV(MenuItem, { value: "bot", children: "Bot" }, void 0, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 77,
              columnNumber: 68
            }, this),
            /* @__PURE__ */ jsxDEV(MenuItem, { value: "human", children: "Nhân viên" }, void 0, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 77,
              columnNumber: 104
            }, this),
            /* @__PURE__ */ jsxDEV(MenuItem, { value: "paused", children: "Tạm dừng" }, void 0, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 77,
              columnNumber: 148
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 76,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV(TextField, { select: true, size: "small", label: "Kênh", value: channelId || "", onChange: (event) => updateFilter("channelId", event.target.value), sx: { flex: 1, minWidth: 160 }, children: [
            /* @__PURE__ */ jsxDEV(MenuItem, { value: "", children: "Tất cả kênh" }, void 0, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 80,
              columnNumber: 25
            }, this),
            metadata.data?.data.channels.map((channel) => /* @__PURE__ */ jsxDEV(MenuItem, { value: channel.id, children: channel.displayName }, channel.id, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 80,
              columnNumber: 113
            }, this))
          ] }, void 0, true, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 79,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV(TextField, { select: true, size: "small", label: "Nhân viên", value: assignedUserId || "", onChange: (event) => updateFilter("assignedUserId", event.target.value), sx: { flex: 1, minWidth: 160 }, children: [
            /* @__PURE__ */ jsxDEV(MenuItem, { value: "", children: "Tất cả nhân viên" }, void 0, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 83,
              columnNumber: 25
            }, this),
            metadata.data?.data.assignees.map((assignee) => /* @__PURE__ */ jsxDEV(MenuItem, { value: assignee.userId, children: assignee.displayName }, assignee.userId, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 83,
              columnNumber: 120
            }, this))
          ] }, void 0, true, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 82,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
          lineNumber: 72,
          columnNumber: 9
        }, this) }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
          lineNumber: 71,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ jsxDEV(QueryState, { query: list, children: [
          /* @__PURE__ */ jsxDEV(List, { disablePadding: true, children: list.data?.data.map((c) => /* @__PURE__ */ jsxDEV(ListItem, { disablePadding: true, children: /* @__PURE__ */ jsxDEV(ListItemButton, { selected: c.id === conversationId, component: RouterLink, to: detailHref(c.id), sx: [layoutSx.inbox.listInset, layoutSx.inbox.listContentGap, { alignItems: "start", borderBottom: 1, borderColor: "divider" }], children: [
            /* @__PURE__ */ jsxDEV(Avatar, { sx: { bgcolor: colors.raised, color: "text.primary", width: 38, height: 38 }, children: c.displayName.slice(0, 1) }, void 0, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 90,
              columnNumber: 33
            }, this),
            /* @__PURE__ */ jsxDEV(Box, { sx: { minWidth: 0, flex: 1 }, children: [
              /* @__PURE__ */ jsxDEV(Stack, { direction: "row", justifyContent: "space-between", sx: [layoutSx.surface.compactContentGap, { alignItems: "center" }], children: [
                /* @__PURE__ */ jsxDEV(Typography, { fontWeight: visualSx.typography.fontWeight.strong, noWrap: true, children: c.displayName }, void 0, false, {
                  fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
                  lineNumber: 93,
                  columnNumber: 41
                }, this),
                c.unreadCount > 0 && /* @__PURE__ */ jsxDEV(Box, { "data-testid": "inbox-unread-count", sx: [layoutSx.inbox.unreadCountInset, { bgcolor: "primary.main", color: colors.onAccent, borderRadius: visualSx.radius.large, fontSize: tokens.fontSizes.meta }], children: c.unreadCount }, void 0, false, {
                  fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
                  lineNumber: 94,
                  columnNumber: 63
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
                lineNumber: 92,
                columnNumber: 37
              }, this),
              /* @__PURE__ */ jsxDEV(Typography, { variant: "body2", noWrap: true, color: "text.secondary", sx: [layoutSx.surface.titleDescriptionGap, { display: "block" }], children: c.lastMessagePreview || "Chưa có tin nhắn" }, void 0, false, {
                fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
                lineNumber: 96,
                columnNumber: 37
              }, this),
              /* @__PURE__ */ jsxDEV(Box, { sx: layoutSx.inbox.listStatusBeforeGap, children: /* @__PURE__ */ jsxDEV(Status, { value: c.mode }, void 0, false, {
                fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
                lineNumber: 97,
                columnNumber: 82
              }, this) }, void 0, false, {
                fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
                lineNumber: 97,
                columnNumber: 37
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 91,
              columnNumber: 33
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 89,
            columnNumber: 29
          }, this) }, c.id, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 88,
            columnNumber: 53
          }, this)) }, void 0, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 87,
            columnNumber: 21
          }, this),
          !list.data?.data.length && /* @__PURE__ */ jsxDEV(Empty, { text: "Chưa có hội thoại phù hợp." }, void 0, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 102,
            columnNumber: 49
          }, this),
          /* @__PURE__ */ jsxDEV(Pager, { page: list.data?.page, cursorParam: listCursorParam }, void 0, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 103,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
          lineNumber: 86,
          columnNumber: 17
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 70,
        columnNumber: 13
      }, this),
      conversationId ? /* @__PURE__ */ jsxDEV(ConversationPanel, { conversationId }, conversationId, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 106,
        columnNumber: 31
      }, this) : /* @__PURE__ */ jsxDEV(Panel, { children: /* @__PURE__ */ jsxDEV(Empty, { text: "Chọn một cuộc trò chuyện để xem lịch sử, tiếp quản và tạo đơn." }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 106,
        columnNumber: 115
      }, this) }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 106,
        columnNumber: 108
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 69,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
    lineNumber: 67,
    columnNumber: 10
  }, this);
}
_s(InboxPage, "PDdHWf3JJnycFYNxevx7q+/ATLA=", false, function() {
  return [useParams, useScope, useSearchParams, useApi, useApi];
});
_c = InboxPage;
function ConversationPanel({
  conversationId
}) {
  _s2();
  const { shop } = useScope();
  const [params] = useSearchParams();
  const c = useApi("getConversation", { path: { conversationId } });
  const messageCursor = params.get("cursor") || void 0;
  const messages = useApi("listMessages", { path: { conversationId }, query: { cursor: messageCursor, limit: 100 } });
  const takeover = useCommand("takeoverConversation", ["getConversation", "listConversations"]);
  const release = useCommand("releaseConversation", ["getConversation", "listConversations"]);
  const resolve = useCommand("resolveConversation", ["getConversation", "listConversations"]);
  const feedback = useCommand("createFeedback", ["listFeedback"]);
  const [action, setAction] = useState(null);
  const [ratingMessage, setRatingMessage] = useState(null);
  const [correction, setCorrection] = useState("");
  const [rating, setRating] = useState("negative");
  const end = useRef(null);
  useEffect(() => {
    if (!messageCursor) end.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [messages.data, messageCursor]);
  const inboxHref = () => {
    const next = new URLSearchParams(params);
    const listCursor = next.get("listCursor");
    next.delete("listCursor");
    next.delete("cursor");
    if (listCursor) next.set("cursor", listCursor);
    const query = next.toString();
    return `/s/${shop.id}/inbox${query ? `?${query}` : ""}`;
  };
  const conversation = c.data?.data;
  return /* @__PURE__ */ jsxDEV(QueryState, { query: c, pendingProfile: "section", children: conversation && /* @__PURE__ */ jsxDEV(SectionGrid, { "data-testid": "inbox-conversation-layout", columns: { xs: "1fr", xl: "minmax(0,1fr) 260px" }, geometry: { minWidth: 0 }, children: [
    /* @__PURE__ */ jsxDEV(Box, { "data-testid": "inbox-thread", component: "section", "aria-label": "Nội dung hội thoại", sx: { minWidth: 0, height: { xl: 650 } }, children: /* @__PURE__ */ jsxDEV(Panel, { geometry: { display: "flex", flexDirection: "column", height: "100%" }, children: [
      /* @__PURE__ */ jsxDEV(ActionGroup, { direction: "row", alignItems: "center", justifyContent: "space-between", bodyMode: "header", children: [
        /* @__PURE__ */ jsxDEV(Stack, { direction: "row", alignItems: "center", sx: [layoutSx.surface.compactContentGap, { flexWrap: "wrap" }], children: [
          /* @__PURE__ */ jsxDEV(Button, { component: RouterLink, to: inboxHref(), sx: { display: { lg: "none" }, minWidth: 44 }, "aria-label": "Danh sách hội thoại", children: /* @__PURE__ */ jsxDEV(ArrowBackRounded, {}, void 0, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 152,
            columnNumber: 41
          }, this) }, void 0, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 151,
            columnNumber: 37
          }, this),
          /* @__PURE__ */ jsxDEV(Avatar, { sx: { bgcolor: colors.selected, color: "primary.main" }, children: conversation.displayName.slice(0, 1) }, void 0, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 154,
            columnNumber: 37
          }, this),
          /* @__PURE__ */ jsxDEV(Box, { children: [
            /* @__PURE__ */ jsxDEV(Typography, { component: "h2", variant: "h6", children: conversation.displayName }, void 0, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 156,
              columnNumber: 41
            }, this),
            /* @__PURE__ */ jsxDEV(Typography, { variant: "caption", color: "text.secondary", children: [
              conversation.mode === "human" ? "Nhân viên đang tiếp quản" : "Trợ lý tự động",
              " · ",
              conversation.id
            ] }, void 0, true, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 157,
              columnNumber: 41
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 155,
            columnNumber: 37
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
          lineNumber: 150,
          columnNumber: 33
        }, this),
        /* @__PURE__ */ jsxDEV(ActionGroup, { direction: "row", children: [
          /* @__PURE__ */ jsxDEV(MutationButton, { permission: "conversations.assign", variant: "outlined", onClick: () => setAction(conversation.mode === "human" ? "release" : "takeover"), children: conversation.mode === "human" ? "Trả lại bot" : "Tiếp quản" }, void 0, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 163,
            columnNumber: 37
          }, this),
          /* @__PURE__ */ jsxDEV(MutationButton, { permission: "conversations.assign", disabled: conversation.status === "resolved", onClick: () => setAction("resolve"), children: "Giải quyết" }, void 0, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 166,
            columnNumber: 37
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
          lineNumber: 162,
          columnNumber: 33
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 149,
        columnNumber: 29
      }, this),
      conversation.sendEligibility.state !== "allowed" && /* @__PURE__ */ jsxDEV(Box, { sx: layoutSx.inbox.paneInset, children: /* @__PURE__ */ jsxDEV(Alert, { severity: "warning", children: [
        "Không được gửi tin: ",
        conversation.sendEligibility.reasonCode || "Chưa xác minh quyền gửi",
        ". Không tự vượt cửa sổ/chính sách kênh."
      ] }, void 0, true, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 173,
        columnNumber: 37
      }, this) }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 172,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV(Box, { "data-testid": "inbox-message-list", sx: [layoutSx.inbox.paneInset, { flex: 1, minHeight: 350, maxHeight: 550, overflowY: "auto", background: colors.canvas }], children: /* @__PURE__ */ jsxDEV(QueryState, { query: messages, children: [
        /* @__PURE__ */ jsxDEV(Stack, { "data-testid": "inbox-message-groups", sx: layoutSx.inbox.messageGroupGap, children: [
          /* @__PURE__ */ jsxDEV(
            ConversationMessageList,
            {
              messages: messages.data?.data || [],
              timezone: shop.timezone,
              onRate: (message) => {
                setRatingMessage(message);
                setCorrection("");
              }
            },
            void 0,
            false,
            {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 181,
              columnNumber: 41
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("div", { ref: end }, void 0, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 189,
            columnNumber: 41
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
          lineNumber: 180,
          columnNumber: 37
        }, this),
        !messages.data?.data.length && /* @__PURE__ */ jsxDEV(Empty, { text: "Chưa có tin nhắn." }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
          lineNumber: 191,
          columnNumber: 69
        }, this),
        /* @__PURE__ */ jsxDEV(Pager, { page: messages.data?.page }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
          lineNumber: 192,
          columnNumber: 37
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 179,
        columnNumber: 33
      }, this) }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 178,
        columnNumber: 29
      }, this),
      /* @__PURE__ */ jsxDEV(ConversationComposer, { conversation }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 195,
        columnNumber: 29
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 148,
      columnNumber: 25
    }, this) }, void 0, false, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 147,
      columnNumber: 21
    }, this),
    /* @__PURE__ */ jsxDEV(ConversationContextPanel, { conversation, children: [
      __MOCK__ && /* @__PURE__ */ jsxDEV(MockSalesFlowPreview, { customerId: conversation.customerId, conversationId: conversation.id }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 199,
        columnNumber: 38
      }, this),
      __MOCK__ && /* @__PURE__ */ jsxDEV(MockMediaPreview, {}, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 200,
        columnNumber: 38
      }, this),
      __MOCK__ && /* @__PURE__ */ jsxDEV(MockUpsellPreview, {}, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 201,
        columnNumber: 38
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 198,
      columnNumber: 21
    }, this),
    /* @__PURE__ */ jsxDEV(
      ConfirmDialog,
      {
        open: !!action,
        title: action === "takeover" ? "Tiếp quản cuộc trò chuyện" : action === "release" ? "Trả cuộc trò chuyện về bot" : "Đánh dấu đã giải quyết",
        description: action === "takeover" ? "Các câu trả lời AI đang chờ phải bị chặn trước khi gửi." : "Hệ thống kiểm lại quyền và phiên bản hội thoại.",
        requireReason: true,
        onClose: () => setAction(null),
        busy: takeover.pending || release.pending || resolve.pending,
        error: takeover.error || release.error || resolve.error,
        onConfirm: (reason) => {
          const operation = action === "takeover" ? takeover : action === "release" ? release : resolve;
          return operation.execute({
            path: { conversationId },
            version: conversation.version,
            body: { expectedVersion: conversation.version, reason }
          });
        }
      },
      void 0,
      false,
      {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 203,
        columnNumber: 21
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(
      EditDialog,
      {
        open: !!ratingMessage,
        title: "Đánh giá câu trả lời",
        onClose: () => setRatingMessage(null),
        busy: feedback.pending,
        actions: /* @__PURE__ */ jsxDEV(
          Button,
          {
            variant: "contained",
            disabled: feedback.pending,
            onClick: async () => {
              if (!ratingMessage) return;
              try {
                await feedback.execute({ body: { conversationId, messageId: ratingMessage.id, rating, correction } });
                setRatingMessage(null);
              } catch {
              }
            },
            children: "Lưu phản hồi"
          },
          void 0,
          false,
          {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 226,
            columnNumber: 11
          },
          this
        ),
        children: [
          /* @__PURE__ */ jsxDEV(ErrorNotice, { error: feedback.error }, void 0, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 243,
            columnNumber: 25
          }, this),
          /* @__PURE__ */ jsxDEV(FormFields, { children: [
            /* @__PURE__ */ jsxDEV(Typography, { sx: { whiteSpace: "pre-wrap" }, children: ratingMessage?.text }, void 0, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 245,
              columnNumber: 29
            }, this),
            /* @__PURE__ */ jsxDEV(TextField, { label: "Đánh giá", select: true, value: rating, onChange: (event) => setRating(event.target.value), autoFocus: true, children: [
              /* @__PURE__ */ jsxDEV(MenuItem, { value: "positive", children: "Hữu ích" }, void 0, false, {
                fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
                lineNumber: 247,
                columnNumber: 33
              }, this),
              /* @__PURE__ */ jsxDEV(MenuItem, { value: "negative", children: "Cần sửa" }, void 0, false, {
                fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
                lineNumber: 248,
                columnNumber: 33
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 246,
              columnNumber: 29
            }, this),
            /* @__PURE__ */ jsxDEV(TextField, { label: "Nội dung đề xuất sửa", multiline: true, minRows: 4, value: correction, onChange: (event) => setCorrection(event.target.value) }, void 0, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 250,
              columnNumber: 29
            }, this),
            /* @__PURE__ */ jsxDEV(Alert, { severity: "info", children: "Phản hồi không tự trở thành kiến thức đã xuất bản. Cần người duyệt và kiểm thử." }, void 0, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
              lineNumber: 251,
              columnNumber: 29
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 244,
            columnNumber: 25
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 220,
        columnNumber: 21
      },
      this
    )
  ] }, void 0, true, {
    fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
    lineNumber: 146,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
    lineNumber: 144,
    columnNumber: 5
  }, this);
}
_s2(ConversationPanel, "q0w2f/X66dh1K3cWNpVhwnG6VyA=", false, function() {
  return [useScope, useSearchParams, useApi, useApi, useCommand, useCommand, useCommand, useCommand];
});
_c2 = ConversationPanel;
function MockMediaPreview() {
  _s3();
  const [open, setOpen] = useState(false);
  return /* @__PURE__ */ jsxDEV(SurfaceContent, { beforeGap: "surface", children: [
    /* @__PURE__ */ jsxDEV(Alert, { severity: "info", action: /* @__PURE__ */ jsxDEV(Button, { size: "small", onClick: () => setOpen((value) => !value), children: open ? "Ẩn mẫu media" : "Xem mẫu ảnh và tin thoại" }, void 0, false, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 262,
      columnNumber: 40
    }, this), children: "Preview chỉ dùng dữ liệu tổng hợp. Message contract chưa có media; nội dung mẫu không được gửi, phát hoặc gắn vào hội thoại." }, void 0, false, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 262,
      columnNumber: 9
    }, this),
    open && /* @__PURE__ */ jsxDEV(Stack, { role: "status", "data-testid": "mock-media-preview", sx: [layoutSx.surface.compactContentGap, layoutSx.surface.compactInset, { border: 1, borderColor: "divider", borderRadius: visualSx.radius.control }], children: [
      /* @__PURE__ */ jsxDEV(Box, { role: "img", "aria-label": "Ảnh sản phẩm mẫu, không phải tệp khách gửi", sx: { minHeight: 80, display: "grid", placeItems: "center", borderRadius: visualSx.radius.control, bgcolor: "action.hover" }, children: /* @__PURE__ */ jsxDEV(Typography, { variant: "body2", children: "Ảnh sản phẩm mẫu · DEMO-MEDIA-IMAGE-01" }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 267,
        columnNumber: 17
      }, this) }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 266,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV(Typography, { variant: "body2", fontWeight: visualSx.typography.fontWeight.strong, children: "Tin thoại mẫu · 00:08 · chưa phát âm thanh" }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 269,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV(Typography, { variant: "caption", color: "text.secondary", children: "Bản chép thử: “Shop còn màu xanh không ạ?” · chưa được người dùng xác nhận." }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 270,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 265,
      columnNumber: 18
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
    lineNumber: 261,
    columnNumber: 10
  }, this);
}
_s3(MockMediaPreview, "xG1TONbKtDWtdOTrXaTAsNhPg/Q=");
_c3 = MockMediaPreview;
const sampleSalesScripts = {
  fashion: {
    label: "Thời trang",
    questions: ["Bạn đang tìm kiểu dáng và dịp sử dụng nào?", "Bạn muốn xem màu và kích cỡ nào?", "Cho mình xin khu vực giao hàng để kiểm tra phí."],
    boundary: "Chỉ tư vấn chất liệu, kích cỡ và chính sách đã có nguồn; thiếu thông tin thì hỏi lại hoặc chuyển nhân viên."
  },
  beauty: {
    label: "Mỹ phẩm",
    questions: ["Bạn đang tìm sản phẩm cho nhu cầu nào?", "Bạn có dị ứng hoặc thành phần cần tránh không?", "Bạn muốn nhân viên tư vấn thêm trước khi chọn?"],
    boundary: "Không chẩn đoán, hứa hiệu quả điều trị hoặc khẳng định phù hợp khi chưa có thông tin nguồn."
  },
  home: {
    label: "Gia dụng",
    questions: ["Bạn cần dùng sản phẩm trong không gian nào?", "Kích thước hoặc công suất mong muốn là bao nhiêu?", "Bạn cần kiểm tra bảo hành hay cách lắp đặt?"],
    boundary: "Thiếu kích thước, bảo hành hoặc hướng dẫn có nguồn thì không tự suy diễn; chuyển nhân viên xác minh."
  }
};
function MockSalesFlowPreview({ customerId, conversationId }) {
  _s4();
  const { shop } = useScope();
  const canReadCatalog = useCan("catalog.read");
  const canReadInventory = useCan("inventory.read");
  const products = useApi("listProducts", { query: { limit: 100 } }, canReadCatalog);
  const stock = useApi("listStockSnapshots", { query: { limit: 100 } }, canReadInventory);
  const [tab, setTab] = useState("script");
  const [industry, setIndustry] = useState("fashion");
  const script = sampleSalesScripts[industry];
  const sourceRows = (products.data?.data || []).filter((product) => product.status === "active").flatMap((product) => product.variants.filter((variant) => variant.active && variant.price).flatMap((variant) => (stock.data?.data || []).filter((snapshot) => snapshot.variantId === variant.id).map((snapshot) => ({ key: `${variant.id}:${snapshot.warehouseId}`, product, variant, snapshot }))));
  return /* @__PURE__ */ jsxDEV(Panel, { title: "Luồng tư vấn bán hàng · bản xem trước", subtitle: "Mẫu tương tác cục bộ; không gọi AI và không gửi tin cho khách.", beforeGap: "surface", bodyMode: "inset", children: /* @__PURE__ */ jsxDEV(SurfaceContent, { children: [
    /* @__PURE__ */ jsxDEV(Alert, { severity: "info", children: "Nội dung dưới đây chỉ minh họa giao diện. Bản demo không tự tạo câu trả lời AI hoặc lưu kịch bản lên máy chủ." }, void 0, false, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 316,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ jsxDEV(Tabs, { value: tab, onChange: (_, value) => setTab(value), variant: "scrollable", scrollButtons: "auto", "aria-label": "Các bước tư vấn bán hàng mẫu", children: [
      /* @__PURE__ */ jsxDEV(Tab, { value: "script", label: "Kịch bản" }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 318,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(Tab, { value: "sources", label: "Giá & tồn" }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 319,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(Tab, { value: "order", label: "Tạo đơn" }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 320,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(Tab, { value: "confirmation", label: "Xác nhận" }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 321,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 317,
      columnNumber: 13
    }, this),
    tab === "script" && /* @__PURE__ */ jsxDEV(SurfaceContent, { role: "tabpanel", "aria-label": "Kịch bản tư vấn mẫu", children: [
      /* @__PURE__ */ jsxDEV(TextField, { select: true, label: "Ngành hàng mẫu", value: industry, onChange: (event) => setIndustry(event.target.value), children: Object.entries(sampleSalesScripts).map(([key, value]) => /* @__PURE__ */ jsxDEV(MenuItem, { value: key, children: value.label }, key, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 325,
        columnNumber: 79
      }, this)) }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 324,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(Typography, { component: "h3", variant: "subtitle2", children: "Câu hỏi gợi ý" }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 327,
        columnNumber: 17
      }, this),
      script.questions.map((question, index) => /* @__PURE__ */ jsxDEV(Typography, { variant: "body2", children: [
        index + 1,
        ". ",
        question
      ] }, question, true, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 328,
        columnNumber: 60
      }, this)),
      /* @__PURE__ */ jsxDEV(Alert, { severity: "warning", children: [
        "Ranh giới mẫu: ",
        script.boundary
      ] }, void 0, true, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 329,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(Typography, { variant: "caption", color: "text.secondary", children: "Bản nháp mẫu riêng với cấu hình bot đang dùng; không có thao tác xuất bản ở đây." }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 330,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 323,
      columnNumber: 34
    }, this),
    tab === "sources" && /* @__PURE__ */ jsxDEV(SurfaceContent, { role: "tabpanel", "aria-label": "Nguồn giá và tồn trong hộp thư", children: [
      /* @__PURE__ */ jsxDEV(Alert, { severity: "info", children: "Giá lấy từ catalog và tồn từ snapshot có thời điểm. Dữ liệu chỉ là mock; cần truy vấn lại trước khi xác nhận đơn." }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 333,
        columnNumber: 17
      }, this),
      !canReadCatalog || !canReadInventory ? /* @__PURE__ */ jsxDEV(Alert, { severity: "warning", children: "Cần quyền xem sản phẩm và tồn kho để đối chiếu nguồn." }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 335,
        columnNumber: 9
      }, this) : /* @__PURE__ */ jsxDEV(QueryState, { query: products, pendingProfile: "section", children: products.data && /* @__PURE__ */ jsxDEV(QueryState, { query: stock, pendingProfile: "section", children: stock.data && /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV(DataTable, { label: "Nguồn giá và tồn trong hộp thư", rows: sourceRows, rowKey: (row) => row.key, empty: "Chưa có sản phẩm đủ dữ liệu để đối chiếu.", columns: [
          { key: "product", label: "Sản phẩm", render: (row) => row.product.name },
          { key: "sku", label: "SKU", render: (row) => row.variant.sku },
          { key: "price", label: "Giá", align: "right", render: (row) => /* @__PURE__ */ jsxDEV(Amount, { value: row.variant.price }, void 0, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 340,
            columnNumber: 78
          }, this) },
          { key: "available", label: "Có thể bán", align: "right", render: (row) => row.snapshot.available },
          { key: "asOf", label: "Snapshot lúc", render: (row) => dateTime(row.snapshot.asOf, shop.timezone) }
        ] }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
          lineNumber: 337,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV(Typography, { variant: "caption", color: "text.secondary", children: "Preview giới hạn ở 100 sản phẩm và 100 snapshot đầu tiên; không phải danh sách đầy đủ." }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
          lineNumber: 344,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV(ActionGroup, { direction: "row", density: "comfortable", children: [
          /* @__PURE__ */ jsxDEV(RouteLink, { to: `/s/${shop.id}/products`, children: "Mở danh sách sản phẩm" }, void 0, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 345,
            columnNumber: 72
          }, this),
          /* @__PURE__ */ jsxDEV(RouteLink, { to: `/s/${shop.id}/inventory`, children: "Mở danh sách tồn kho" }, void 0, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
            lineNumber: 345,
            columnNumber: 146
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
          lineNumber: 345,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 336,
        columnNumber: 147
      }, this) }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 336,
        columnNumber: 81
      }, this) }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 336,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 332,
      columnNumber: 35
    }, this),
    tab === "order" && /* @__PURE__ */ jsxDEV(SurfaceContent, { role: "tabpanel", "aria-label": "Tạo đơn từ hội thoại", children: [
      /* @__PURE__ */ jsxDEV(Typography, { variant: "body2", children: "Chuyển sang biểu mẫu đơn để nhân viên kiểm tra khách, sản phẩm, số lượng và báo giá." }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 349,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(RouteLink, { to: `/s/${shop.id}/orders/new?customerId=${customerId}&conversationId=${conversationId}`, children: "Mở biểu mẫu tạo đơn từ hội thoại" }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 350,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(Alert, { severity: "info", children: "Đơn trong demo được lưu vào MSW cục bộ của tab; đây không phải đơn trên máy chủ." }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 351,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 348,
      columnNumber: 33
    }, this),
    tab === "confirmation" && /* @__PURE__ */ jsxDEV(SurfaceContent, { role: "tabpanel", "aria-label": "Điều kiện xác nhận đơn", children: [
      /* @__PURE__ */ jsxDEV(Alert, { severity: "warning", children: "Không tự chốt đơn trong giao diện này. Bằng chứng xác nhận của khách, báo giá hiện hành và điều kiện giao nhận phải được kiểm tra trước khi nhân viên xác nhận." }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 354,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(Button, { variant: "outlined", disabled: true, children: "Tự động xác nhận đơn chưa được hỗ trợ" }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 355,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ jsxDEV(Typography, { variant: "caption", color: "text.secondary", children: "Cần bổ sung capability và policy trong contract trước khi bật tự động xác nhận." }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 356,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 353,
      columnNumber: 40
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
    lineNumber: 315,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
    lineNumber: 314,
    columnNumber: 10
  }, this);
}
_s4(MockSalesFlowPreview, "2T9NFmo2MyYgbt2bAsU1NH/v2g0=", false, function() {
  return [useScope, useCan, useCan, useApi, useApi];
});
_c4 = MockSalesFlowPreview;
function MockUpsellPreview() {
  _s5();
  const [open, setOpen] = useState(false);
  return /* @__PURE__ */ jsxDEV(SurfaceContent, { beforeGap: "surface", children: [
    /* @__PURE__ */ jsxDEV(Typography, { component: "h3", variant: "subtitle2", children: "Gợi ý bán kèm mẫu · DEMO-PROMO-01" }, void 0, false, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 365,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV(Alert, { severity: "info", children: "Combo áo thun + túi tote chỉ minh họa giao diện. Không có API khuyến mại; giá, lợi nhuận, SKU và tồn kho chưa được xác thực." }, void 0, false, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 366,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV(Button, { size: "small", variant: "outlined", onClick: () => setOpen((value) => !value), children: open ? "Ẩn điều kiện mẫu" : "Xem điều kiện combo mẫu" }, void 0, false, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 367,
      columnNumber: 9
    }, this),
    open && /* @__PURE__ */ jsxDEV(Stack, { role: "status", "data-testid": "mock-promotion-preview", sx: [layoutSx.surface.compactContentGap, layoutSx.surface.compactInset, { border: 1, borderColor: "divider", borderRadius: visualSx.radius.control }], children: [
      /* @__PURE__ */ jsxDEV(Typography, { component: "h3", variant: "subtitle2", children: "Combo mẫu · DEMO-PROMO-01" }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 369,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV(Typography, { variant: "body2", children: "Điều kiện minh họa: có ít nhất một áo và một phụ kiện trong đơn nháp." }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 370,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV(Typography, { variant: "caption", color: "text.secondary", children: "Không áp dụng giảm giá, không sửa đơn và không khẳng định đạt biên lợi nhuận." }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
        lineNumber: 371,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
      lineNumber: 368,
      columnNumber: 18
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx",
    lineNumber: 364,
    columnNumber: 10
  }, this);
}
_s5(MockUpsellPreview, "xG1TONbKtDWtdOTrXaTAsNhPg/Q=");
_c5 = MockUpsellPreview;
var _c, _c2, _c3, _c4, _c5;
$RefreshReg$(_c, "InboxPage");
$RefreshReg$(_c2, "ConversationPanel");
$RefreshReg$(_c3, "MockMediaPreview");
$RefreshReg$(_c4, "MockSalesFlowPreview");
$RefreshReg$(_c5, "MockUpsellPreview");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBK0NXLG1CQUNILGNBREc7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBL0NYLFNBQVNBLGFBQWFDLFlBQVlDLFlBQVlDLGFBQWFDLHNCQUFzQjtBQUNqRixTQUFTQyxXQUFXQyxRQUFRQyxnQkFBZ0I7QUFDNUMsU0FBU0MsZ0JBQWdCO0FBQ3pCLFNBQVNDLFFBQVFDLFlBQVlDLFdBQVdDLHVCQUF1QjtBQUMvRCxTQUFTQyxPQUFPQyxRQUFRQyxLQUFLQyxRQUFRQyxNQUFNQyxVQUFVQyxnQkFBZ0JDLFVBQVVDLE9BQU9DLEtBQUtDLE1BQU1DLFdBQVdDLGtCQUFrQjtBQUM5SCxPQUFPQyxzQkFBc0I7QUFFN0IsU0FBU0MsUUFBUUMsY0FBYztBQUMvQixTQUFTQyxRQUFRQyxrQkFBa0I7QUFDbkMsU0FBU0MsVUFBVUMsY0FBYztBQUNqQyxTQUFTQyxnQkFBZ0I7QUFDekIsU0FBU0MsWUFBWUMsT0FBT0MsWUFBWUMsU0FBU0MsT0FBT0MsUUFBUUMsZ0JBQWdCQyxZQUFZQyxhQUFhQyxlQUFlQyxXQUFXQyxPQUFPQyxXQUFXQyxjQUFjO0FBQ25LLFNBQVNDLGdCQUFnQjtBQUN6QixTQUFTQyxzQkFBc0JDLDBCQUEwQkMsK0JBQStCO0FBQ2pGLGdCQUFTQyxZQUFZO0FBQUFDLEtBQUE7QUFDeEIsUUFBTSxFQUFFQyxlQUFlLElBQUkzQyxVQUFVO0FBQ3JDLFFBQU0sRUFBRTRDLEtBQUssSUFBSXhCLFNBQVM7QUFDMUIsUUFBTSxDQUFDeUIsUUFBUUMsU0FBUyxJQUFJN0MsZ0JBQWdCO0FBQzVDLFFBQU04QyxJQUFJRixPQUFPRyxJQUFJLEdBQUcsS0FBSztBQUM3QixRQUFNQyxVQUFVSixPQUFPRyxJQUFJLE1BQU07QUFDakMsUUFBTUUsT0FBUSxDQUFDLE9BQU8sU0FBUyxRQUFRLEVBQVlDLEtBQUssQ0FBQUMsVUFBU0EsVUFBVUgsT0FBTztBQUNsRixRQUFNSSxTQUFVLENBQUMsUUFBUSxVQUFVLEVBQVlGLEtBQUssQ0FBQUMsVUFBU0EsVUFBVVAsT0FBT0csSUFBSSxRQUFRLENBQUM7QUFDM0YsUUFBTU0sWUFBWVQsT0FBT0csSUFBSSxXQUFXLEtBQUtPO0FBQzdDLFFBQU1DLGlCQUFpQlgsT0FBT0csSUFBSSxnQkFBZ0IsS0FBS087QUFDdkQsUUFBTUUsa0JBQWtCZCxpQkFBaUIsZUFBZTtBQUN4RCxRQUFNZSxTQUFTYixPQUFPRyxJQUFJUyxlQUFlLEtBQUtGO0FBQzlDLFFBQU1JLFdBQVd6QyxPQUFPLGtCQUFrQjtBQUMxQyxRQUFNMEMsT0FBTzFDLE9BQU8scUJBQXFCLEVBQUUyQyxPQUFPLEVBQUVkLEdBQUdBLEtBQUtRLFFBQVdGLFFBQVFILE1BQU1JLFdBQVdFLGdCQUFnQkUsUUFBUUksT0FBTyxHQUFHLEVBQUUsQ0FBQztBQUNySSxRQUFNQyxlQUFlQSxDQUFDQyxLQUFhWixVQUFrQjtBQUNqRCxVQUFNYSxPQUFPLElBQUlDLGdCQUFnQnJCLE1BQU07QUFDdkMsUUFBSU87QUFDQWEsV0FBS0UsSUFBSUgsS0FBS1osS0FBSztBQUFBO0FBRW5CYSxXQUFLRyxPQUFPSixHQUFHO0FBQ25CQyxTQUFLRyxPQUFPWCxlQUFlO0FBQzNCWCxjQUFVbUIsSUFBSTtBQUFBLEVBQ2xCO0FBQ0EsUUFBTUksYUFBYUEsQ0FBQ0MsT0FBZTtBQUMvQixVQUFNTCxPQUFPLElBQUlDLGdCQUFnQnJCLE1BQU07QUFDdkMsVUFBTTBCLGFBQWFOLEtBQUtqQixJQUFJUyxlQUFlO0FBQzNDUSxTQUFLRyxPQUFPLFFBQVE7QUFDcEJILFNBQUtHLE9BQU8sWUFBWTtBQUN4QixRQUFJRztBQUNBTixXQUFLRSxJQUFJLGNBQWNJLFVBQVU7QUFDckMsVUFBTVYsUUFBUUksS0FBS08sU0FBUztBQUM1QixXQUFPLE1BQU01QixLQUFLMEIsRUFBRSxVQUFVQSxFQUFFLEdBQUdULFFBQVEsSUFBSUEsS0FBSyxLQUFLLEVBQUU7QUFBQSxFQUMvRDtBQUNBLFNBQU8sbUNBQ0g7QUFBQSwyQkFBQyxjQUFXLE9BQU0sc0JBQXFCLFVBQVMsOEVBQWhEO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBMEg7QUFBQSxJQUMxSCx1QkFBQyxlQUFZLFNBQVMsRUFBRVksSUFBSSxPQUFPQyxJQUFJLHNCQUFzQixHQUFHLFVBQVUsRUFBQ0MsV0FBVyxJQUFHLEdBQ3JGO0FBQUEsNkJBQUMsU0FBTSxVQUFVLEVBQUVDLFNBQVMsRUFBRUgsSUFBSTlCLGlCQUFpQixTQUFTLFNBQVMrQixJQUFJLFFBQVEsRUFBRSxHQUMvRTtBQUFBLCtCQUFDLFdBQVEsV0FBVSxxQkFBb0IsYUFBWSxrQkFBaUIsYUFBYWpCLGlCQUFpQixTQUNsRyx1QkFBQyxjQUFXLFdBQVcsRUFBRWdCLElBQUksVUFBVUksSUFBSSxNQUFNLEdBQUcsVUFBUyxRQUFPLE1BQUssU0FBUSxjQUFXLG9CQUN4RjtBQUFBLGlDQUFDLGFBQVUsUUFBTSxNQUFDLE1BQUssU0FBUSxPQUFNLGNBQWEsT0FBT3hCLFVBQVUsSUFBSSxVQUFVLENBQUF5QixVQUFTZixhQUFhLFVBQVVlLE1BQU1DLE9BQU8zQixLQUFLLEdBQUcsSUFBSSxFQUFFNEIsTUFBTSxHQUFHQyxVQUFVLElBQUksR0FDL0o7QUFBQSxtQ0FBQyxZQUFTLE9BQU0sSUFBRyxpQ0FBbkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBb0M7QUFBQSxZQUFXLHVCQUFDLFlBQVMsT0FBTSxRQUFPLHVCQUF2QjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE4QjtBQUFBLFlBQVcsdUJBQUMsWUFBUyxPQUFNLFlBQVcsNkJBQTNCO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXdDO0FBQUEsZUFEcEk7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLFVBQ0EsdUJBQUMsYUFBVSxRQUFNLE1BQUMsTUFBSyxTQUFRLE9BQU0sVUFBUyxPQUFPL0IsUUFBUSxJQUFJLFVBQVUsQ0FBQTRCLFVBQVNmLGFBQWEsUUFBUWUsTUFBTUMsT0FBTzNCLEtBQUssR0FBRyxJQUFJLEVBQUU0QixNQUFNLEdBQUdDLFVBQVUsSUFBSSxHQUN2SjtBQUFBLG1DQUFDLFlBQVMsT0FBTSxJQUFHLDZCQUFuQjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFnQztBQUFBLFlBQVcsdUJBQUMsWUFBUyxPQUFNLE9BQU0sbUJBQXRCO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXlCO0FBQUEsWUFBVyx1QkFBQyxZQUFTLE9BQU0sU0FBUSx5QkFBeEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBaUM7QUFBQSxZQUFXLHVCQUFDLFlBQVMsT0FBTSxVQUFTLHdCQUF6QjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFpQztBQUFBLGVBRGhLO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBRUE7QUFBQSxVQUNBLHVCQUFDLGFBQVUsUUFBTSxNQUFDLE1BQUssU0FBUSxPQUFNLFFBQU8sT0FBTzNCLGFBQWEsSUFBSSxVQUFVLENBQUF3QixVQUFTZixhQUFhLGFBQWFlLE1BQU1DLE9BQU8zQixLQUFLLEdBQUcsSUFBSSxFQUFFNEIsTUFBTSxHQUFHQyxVQUFVLElBQUksR0FDL0o7QUFBQSxtQ0FBQyxZQUFTLE9BQU0sSUFBRywyQkFBbkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBOEI7QUFBQSxZQUFZdEIsU0FBU3VCLE1BQU1BLEtBQUtDLFNBQVNDLElBQUksQ0FBQUMsWUFBVyx1QkFBQyxZQUEwQixPQUFPQSxRQUFRZixJQUFLZSxrQkFBUUMsZUFBeENELFFBQVFmLElBQXZCO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQW1FLENBQVc7QUFBQSxlQUR4SztBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUVBO0FBQUEsVUFDQSx1QkFBQyxhQUFVLFFBQU0sTUFBQyxNQUFLLFNBQVEsT0FBTSxhQUFZLE9BQU9kLGtCQUFrQixJQUFJLFVBQVUsQ0FBQXNCLFVBQVNmLGFBQWEsa0JBQWtCZSxNQUFNQyxPQUFPM0IsS0FBSyxHQUFHLElBQUksRUFBRTRCLE1BQU0sR0FBR0MsVUFBVSxJQUFJLEdBQzlLO0FBQUEsbUNBQUMsWUFBUyxPQUFNLElBQUcsZ0NBQW5CO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQW1DO0FBQUEsWUFBWXRCLFNBQVN1QixNQUFNQSxLQUFLSyxVQUFVSCxJQUFJLENBQUFJLGFBQVksdUJBQUMsWUFBK0IsT0FBT0EsU0FBU0MsUUFBU0QsbUJBQVNGLGVBQW5ERSxTQUFTQyxRQUF4QjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUE4RSxDQUFXO0FBQUEsZUFEMUw7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLGFBWko7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQWFBLEtBZEE7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQWNjO0FBQUEsUUFDZCx1QkFBQyxjQUFXLE9BQU83QixNQUNmO0FBQUEsaUNBQUMsUUFBSyxnQkFBYyxNQUNmQSxlQUFLc0IsTUFBTUEsS0FBS0UsSUFBSSxDQUFBTSxNQUFLLHVCQUFDLFlBQW9CLGdCQUFjLE1BQ3pELGlDQUFDLGtCQUFlLFVBQVVBLEVBQUVwQixPQUFPM0IsZ0JBQWdCLFdBQVc1QyxZQUFZLElBQUlzRSxXQUFXcUIsRUFBRXBCLEVBQUUsR0FBRyxJQUFJLENBQUNqQyxTQUFTc0QsTUFBTUMsV0FBV3ZELFNBQVNzRCxNQUFNRSxnQkFBZ0IsRUFBRUMsWUFBWSxTQUFTQyxjQUFjLEdBQUdDLGFBQWEsVUFBVSxDQUFDLEdBQzFOO0FBQUEsbUNBQUMsVUFBTyxJQUFJLEVBQUVDLFNBQVNqRixPQUFPa0YsUUFBUUMsT0FBTyxnQkFBZ0JDLE9BQU8sSUFBSUMsUUFBUSxHQUFHLEdBQUlYLFlBQUVKLFlBQVlnQixNQUFNLEdBQUcsQ0FBQyxLQUEvRztBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFpSDtBQUFBLFlBQ2pILHVCQUFDLE9BQUksSUFBSSxFQUFFckIsVUFBVSxHQUFHRCxNQUFNLEVBQUUsR0FDNUI7QUFBQSxxQ0FBQyxTQUFNLFdBQVUsT0FBTSxnQkFBZSxpQkFBZ0IsSUFBSSxDQUFDM0MsU0FBU2tFLFFBQVFDLG1CQUFtQixFQUFFVixZQUFZLFNBQVMsQ0FBQyxHQUNuSDtBQUFBLHVDQUFDLGNBQVcsWUFBWWpHLFNBQVM0RyxXQUFXQyxXQUFXQyxRQUFRLFFBQU0sTUFBRWpCLFlBQUVKLGVBQXpFO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQXFGO0FBQUEsZ0JBQ3BGSSxFQUFFa0IsY0FBYyxLQUFLLHVCQUFDLE9BQUksZUFBWSxzQkFBcUIsSUFBSSxDQUFDdkUsU0FBU3NELE1BQU1rQixrQkFBa0IsRUFBRVosU0FBUyxnQkFBZ0JFLE9BQU9uRixPQUFPOEYsVUFBVUMsY0FBY2xILFNBQVNtSCxPQUFPQyxPQUFPQyxVQUFVakcsT0FBT2tHLFVBQVVDLEtBQUssQ0FBQyxHQUFJMUIsWUFBRWtCLGVBQTNNO0FBQUE7QUFBQTtBQUFBO0FBQUEsdUJBQXVOO0FBQUEsbUJBRmpQO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBR0E7QUFBQSxjQUNBLHVCQUFDLGNBQVcsU0FBUSxTQUFRLFFBQU0sTUFBQyxPQUFNLGtCQUFpQixJQUFJLENBQUN2RSxTQUFTa0UsUUFBUWMscUJBQXFCLEVBQUV6QyxTQUFTLFFBQVEsQ0FBQyxHQUFJYyxZQUFFNEIsc0JBQXNCLHNCQUFySjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUF3SztBQUFBLGNBQ3hLLHVCQUFDLE9BQUksSUFBSWpGLFNBQVNzRCxNQUFNNEIscUJBQXFCLGlDQUFDLFVBQU8sT0FBTzdCLEVBQUV4QyxRQUFqQjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFzQixLQUFuRTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFzRTtBQUFBLGlCQU4xRTtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQU9BO0FBQUEsZUFUSjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQVVBLEtBWHFDd0MsRUFBRXBCLElBQWpCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBWTFCLENBQVcsS0FiZjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQWNBO0FBQUEsVUFDQyxDQUFDVixLQUFLc0IsTUFBTUEsS0FBS3NDLFVBQVUsdUJBQUMsU0FBTSxNQUFLLGdDQUFaO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQXdDO0FBQUEsVUFDcEUsdUJBQUMsU0FBTSxNQUFNNUQsS0FBS3NCLE1BQU11QyxNQUFNLGFBQWFoRSxtQkFBM0M7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBMkQ7QUFBQSxhQWpCL0Q7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQWtCQTtBQUFBLFdBbENKO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFtQ0E7QUFBQSxNQUNDZCxpQkFBaUIsdUJBQUMscUJBQXVDLGtCQUFoQkEsZ0JBQXhCO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBdUUsSUFBTSx1QkFBQyxTQUFNLGlDQUFDLFNBQU0sTUFBSyxvRUFBWjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQTRFLEtBQW5GO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBc0Y7QUFBQSxTQXJDekw7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQXNDQTtBQUFBLE9BeENHO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0F5Q1A7QUFDSjtBQUFDRCxHQTNFZUQsV0FBUztBQUFBLFVBQ016QyxXQUNWb0IsVUFDV25CLGlCQVNYaUIsUUFDSkEsTUFBTTtBQUFBO0FBQUEsS0FiUHVCO0FBNEVoQixTQUFTaUYsa0JBQWtCO0FBQUEsRUFBRS9FO0FBRTdCLEdBQUc7QUFBQWdGLE1BQUE7QUFDQyxRQUFNLEVBQUUvRSxLQUFLLElBQUl4QixTQUFTO0FBQzFCLFFBQU0sQ0FBQ3lCLE1BQU0sSUFBSTVDLGdCQUFnQjtBQUNqQyxRQUFNeUYsSUFBSXhFLE9BQU8sbUJBQW1CLEVBQUUwRyxNQUFNLEVBQUVqRixlQUFlLEVBQUUsQ0FBQztBQUNoRSxRQUFNa0YsZ0JBQWdCaEYsT0FBT0csSUFBSSxRQUFRLEtBQUtPO0FBQzlDLFFBQU11RSxXQUFXNUcsT0FBTyxnQkFBZ0IsRUFBRTBHLE1BQU0sRUFBRWpGLGVBQWUsR0FBR2tCLE9BQU8sRUFBRUgsUUFBUW1FLGVBQWUvRCxPQUFPLElBQUksRUFBRSxDQUFDO0FBQ2xILFFBQU1pRSxXQUFXNUcsV0FBVyx3QkFBd0IsQ0FBQyxtQkFBbUIsbUJBQW1CLENBQUM7QUFDNUYsUUFBTTZHLFVBQVU3RyxXQUFXLHVCQUF1QixDQUFDLG1CQUFtQixtQkFBbUIsQ0FBQztBQUMxRixRQUFNOEcsVUFBVTlHLFdBQVcsdUJBQXVCLENBQUMsbUJBQW1CLG1CQUFtQixDQUFDO0FBQzFGLFFBQU0rRyxXQUFXL0csV0FBVyxrQkFBa0IsQ0FBQyxjQUFjLENBQUM7QUFDOUQsUUFBTSxDQUFDZ0gsUUFBUUMsU0FBUyxJQUFJeEksU0FBb0QsSUFBSTtBQUNwRixRQUFNLENBQUN5SSxlQUFlQyxnQkFBZ0IsSUFBSTFJLFNBQXlCLElBQUk7QUFDdkUsUUFBTSxDQUFDMkksWUFBWUMsYUFBYSxJQUFJNUksU0FBUyxFQUFFO0FBQy9DLFFBQU0sQ0FBQzZJLFFBQVFDLFNBQVMsSUFBSTlJLFNBQWtDLFVBQVU7QUFDeEUsUUFBTStJLE1BQU1oSixPQUF1QixJQUFJO0FBRXZDRCxZQUFVLE1BQU07QUFDWixRQUFJLENBQUNtSSxjQUFlYyxLQUFJQyxTQUFTQyxlQUFlLEVBQUVDLE9BQU8sV0FBV0MsVUFBVSxPQUFPLENBQUM7QUFBQSxFQUMxRixHQUFHLENBQUNqQixTQUFTNUMsTUFBTTJDLGFBQWEsQ0FBQztBQUVqQyxRQUFNbUIsWUFBWUEsTUFBTTtBQUNwQixVQUFNL0UsT0FBTyxJQUFJQyxnQkFBZ0JyQixNQUFNO0FBQ3ZDLFVBQU0wQixhQUFhTixLQUFLakIsSUFBSSxZQUFZO0FBQ3hDaUIsU0FBS0csT0FBTyxZQUFZO0FBQ3hCSCxTQUFLRyxPQUFPLFFBQVE7QUFDcEIsUUFBSUcsV0FBWU4sTUFBS0UsSUFBSSxVQUFVSSxVQUFVO0FBQzdDLFVBQU1WLFFBQVFJLEtBQUtPLFNBQVM7QUFDNUIsV0FBTyxNQUFNNUIsS0FBSzBCLEVBQUUsU0FBU1QsUUFBUSxJQUFJQSxLQUFLLEtBQUssRUFBRTtBQUFBLEVBQ3pEO0FBRUEsUUFBTW9GLGVBQWV2RCxFQUFFUixNQUFNQTtBQUM3QixTQUNJLHVCQUFDLGNBQVcsT0FBT1EsR0FBRyxnQkFBZSxXQUNoQ3VELDBCQUNHLHVCQUFDLGVBQVksZUFBWSw2QkFBNEIsU0FBUyxFQUFFeEUsSUFBSSxPQUFPeUUsSUFBSSxzQkFBc0IsR0FBRyxVQUFVLEVBQUNqRSxVQUFVLEVBQUMsR0FDMUg7QUFBQSwyQkFBQyxPQUFJLGVBQVksZ0JBQWUsV0FBVSxXQUFVLGNBQVcsc0JBQXFCLElBQUksRUFBRUEsVUFBVSxHQUFHb0IsUUFBUSxFQUFFNkMsSUFBSSxJQUFJLEVBQUUsR0FDdkgsaUNBQUMsU0FBTSxVQUFVLEVBQUV0RSxTQUFTLFFBQVF1RSxlQUFlLFVBQVU5QyxRQUFRLE9BQU8sR0FDeEU7QUFBQSw2QkFBQyxlQUFZLFdBQVUsT0FBTSxZQUFXLFVBQVMsZ0JBQWUsaUJBQWdCLFVBQVMsVUFDckY7QUFBQSwrQkFBQyxTQUFNLFdBQVUsT0FBTSxZQUFXLFVBQVMsSUFBSSxDQUFDaEUsU0FBU2tFLFFBQVFDLG1CQUFtQixFQUFFNEMsVUFBVSxPQUFPLENBQUMsR0FDcEc7QUFBQSxpQ0FBQyxVQUFPLFdBQVdySixZQUFZLElBQUlpSixVQUFVLEdBQUcsSUFBSSxFQUFFcEUsU0FBUyxFQUFFRixJQUFJLE9BQU8sR0FBR08sVUFBVSxHQUFHLEdBQUcsY0FBVyx1QkFDdEcsaUNBQUMsc0JBQUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBaUIsS0FEckI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLFVBQ0EsdUJBQUMsVUFBTyxJQUFJLEVBQUVnQixTQUFTakYsT0FBT3FJLFVBQVVsRCxPQUFPLGVBQWUsR0FBSThDLHVCQUFhM0QsWUFBWWdCLE1BQU0sR0FBRyxDQUFDLEtBQXJHO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQXVHO0FBQUEsVUFDdkcsdUJBQUMsT0FDRztBQUFBLG1DQUFDLGNBQVcsV0FBVSxNQUFLLFNBQVEsTUFBTTJDLHVCQUFhM0QsZUFBdEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBa0U7QUFBQSxZQUNsRSx1QkFBQyxjQUFXLFNBQVEsV0FBVSxPQUFNLGtCQUMvQjJEO0FBQUFBLDJCQUFhL0YsU0FBUyxVQUFVLDZCQUE2QjtBQUFBLGNBQWlCO0FBQUEsY0FBSStGLGFBQWEzRTtBQUFBQSxpQkFEcEc7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFFQTtBQUFBLGVBSko7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFLQTtBQUFBLGFBVko7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQVdBO0FBQUEsUUFDQSx1QkFBQyxlQUFZLFdBQVUsT0FDbkI7QUFBQSxpQ0FBQyxrQkFBZSxZQUFXLHdCQUF1QixTQUFRLFlBQVcsU0FBUyxNQUFNOEQsVUFBVWEsYUFBYS9GLFNBQVMsVUFBVSxZQUFZLFVBQVUsR0FDL0krRix1QkFBYS9GLFNBQVMsVUFBVSxnQkFBZ0IsZUFEckQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFFQTtBQUFBLFVBQ0EsdUJBQUMsa0JBQWUsWUFBVyx3QkFBdUIsVUFBVStGLGFBQWE1RixXQUFXLFlBQVksU0FBUyxNQUFNK0UsVUFBVSxTQUFTLEdBQUUsMEJBQXBJO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBRUE7QUFBQSxhQU5KO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFPQTtBQUFBLFdBcEJKO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFxQkE7QUFBQSxNQUNDYSxhQUFhSyxnQkFBZ0JDLFVBQVUsYUFDcEMsdUJBQUMsT0FBSSxJQUFJbEgsU0FBU3NELE1BQU02RCxXQUNwQixpQ0FBQyxTQUFNLFVBQVMsV0FBUztBQUFBO0FBQUEsUUFDQVAsYUFBYUssZ0JBQWdCRyxjQUFjO0FBQUEsUUFBMEI7QUFBQSxXQUQ5RjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRUEsS0FISjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBSUE7QUFBQSxNQUVKLHVCQUFDLE9BQUksZUFBWSxzQkFBcUIsSUFBSSxDQUFDcEgsU0FBU3NELE1BQU02RCxXQUFXLEVBQUV4RSxNQUFNLEdBQUdMLFdBQVcsS0FBSytFLFdBQVcsS0FBS0MsV0FBVyxRQUFRQyxZQUFZNUksT0FBTzZJLE9BQU8sQ0FBQyxHQUMxSixpQ0FBQyxjQUFXLE9BQU8vQixVQUNmO0FBQUEsK0JBQUMsU0FBTSxlQUFZLHdCQUF1QixJQUFJekYsU0FBU3NELE1BQU1tRSxpQkFDekQ7QUFBQTtBQUFBLFlBQUM7QUFBQTtBQUFBLGNBQ0csVUFBVWhDLFNBQVM1QyxNQUFNQSxRQUFRO0FBQUEsY0FDakMsVUFBVXRDLEtBQUttSDtBQUFBQSxjQUNmLFFBQVEsQ0FBQUMsWUFBVztBQUNmMUIsaUNBQWlCMEIsT0FBTztBQUN4QnhCLDhCQUFjLEVBQUU7QUFBQSxjQUNwQjtBQUFBO0FBQUEsWUFOSjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsVUFNTTtBQUFBLFVBRU4sdUJBQUMsU0FBSSxLQUFLRyxPQUFWO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQWM7QUFBQSxhQVRsQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBVUE7QUFBQSxRQUNDLENBQUNiLFNBQVM1QyxNQUFNQSxLQUFLc0MsVUFBVSx1QkFBQyxTQUFNLE1BQUssdUJBQVo7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUErQjtBQUFBLFFBQy9ELHVCQUFDLFNBQU0sTUFBTU0sU0FBUzVDLE1BQU11QyxRQUE1QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQWlDO0FBQUEsV0FickM7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQWNBLEtBZko7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQWdCQTtBQUFBLE1BQ0EsdUJBQUMsd0JBQXFCLGdCQUF0QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWlEO0FBQUEsU0EvQ3JEO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FnREEsS0FqREo7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQWtEQTtBQUFBLElBQ0EsdUJBQUMsNEJBQXlCLGNBQ3JCd0M7QUFBQUEsa0JBQVksdUJBQUMsd0JBQXFCLFlBQVloQixhQUFhaUIsWUFBWSxnQkFBZ0JqQixhQUFhM0UsTUFBeEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUEyRjtBQUFBLE1BQ3ZHMkYsWUFBWSx1QkFBQyxzQkFBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWlCO0FBQUEsTUFDN0JBLFlBQVksdUJBQUMsdUJBQUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFrQjtBQUFBLFNBSG5DO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FJQTtBQUFBLElBQ0E7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNHLE1BQU0sQ0FBQyxDQUFDOUI7QUFBQUEsUUFDUixPQUFPQSxXQUFXLGFBQWEsOEJBQThCQSxXQUFXLFlBQVksK0JBQStCO0FBQUEsUUFDbkgsYUFBYUEsV0FBVyxhQUFhLDREQUE0RDtBQUFBLFFBQ2pHO0FBQUEsUUFDQSxTQUFTLE1BQU1DLFVBQVUsSUFBSTtBQUFBLFFBQzdCLE1BQU1MLFNBQVNvQyxXQUFXbkMsUUFBUW1DLFdBQVdsQyxRQUFRa0M7QUFBQUEsUUFDckQsT0FBT3BDLFNBQVNxQyxTQUFTcEMsUUFBUW9DLFNBQVNuQyxRQUFRbUM7QUFBQUEsUUFDbEQsV0FBVyxDQUFBQyxXQUFVO0FBQ2pCLGdCQUFNQyxZQUFZbkMsV0FBVyxhQUFhSixXQUFXSSxXQUFXLFlBQVlILFVBQVVDO0FBQ3RGLGlCQUFPcUMsVUFBVUMsUUFBUTtBQUFBLFlBQ3JCM0MsTUFBTSxFQUFFakYsZUFBZTtBQUFBLFlBQ3ZCNkgsU0FBU3ZCLGFBQWF1QjtBQUFBQSxZQUN0QkMsTUFBTSxFQUFFQyxpQkFBaUJ6QixhQUFhdUIsU0FBU0gsT0FBTztBQUFBLFVBQzFELENBQUM7QUFBQSxRQUNMO0FBQUE7QUFBQSxNQWZKO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQWVNO0FBQUEsSUFFTjtBQUFBLE1BQUM7QUFBQTtBQUFBLFFBQ0csTUFBTSxDQUFDLENBQUNoQztBQUFBQSxRQUNSLE9BQU07QUFBQSxRQUNOLFNBQVMsTUFBTUMsaUJBQWlCLElBQUk7QUFBQSxRQUNwQyxNQUFNSixTQUFTaUM7QUFBQUEsUUFDZixTQUNJO0FBQUEsVUFBQztBQUFBO0FBQUEsWUFDRyxTQUFRO0FBQUEsWUFDUixVQUFVakMsU0FBU2lDO0FBQUFBLFlBQ25CLFNBQVMsWUFBWTtBQUNqQixrQkFBSSxDQUFDOUIsY0FBZTtBQUNwQixrQkFBSTtBQUNBLHNCQUFNSCxTQUFTcUMsUUFBUSxFQUFFRSxNQUFNLEVBQUU5SCxnQkFBZ0JnSSxXQUFXdEMsY0FBYy9ELElBQUltRSxRQUFRRixXQUFXLEVBQUUsQ0FBQztBQUNwR0QsaUNBQWlCLElBQUk7QUFBQSxjQUN6QixRQUFRO0FBQUEsY0FDSjtBQUFBLFlBRVI7QUFBQSxZQUFFO0FBQUE7QUFBQSxVQVhOO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQWNBO0FBQUEsUUFHSjtBQUFBLGlDQUFDLGVBQVksT0FBT0osU0FBU2tDLFNBQTdCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQW1DO0FBQUEsVUFDbkMsdUJBQUMsY0FDRztBQUFBLG1DQUFDLGNBQVcsSUFBSSxFQUFFUSxZQUFZLFdBQVcsR0FBSXZDLHlCQUFld0MsUUFBNUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBaUU7QUFBQSxZQUNqRSx1QkFBQyxhQUFVLE9BQU0sWUFBVyxRQUFNLE1BQUMsT0FBT3BDLFFBQVEsVUFBVSxDQUFBM0QsVUFBUzRELFVBQVU1RCxNQUFNQyxPQUFPM0IsS0FBc0IsR0FBRyxXQUFTLE1BQzFIO0FBQUEscUNBQUMsWUFBUyxPQUFNLFlBQVcsdUJBQTNCO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQWtDO0FBQUEsY0FDbEMsdUJBQUMsWUFBUyxPQUFNLFlBQVcsdUJBQTNCO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQWtDO0FBQUEsaUJBRnRDO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBR0E7QUFBQSxZQUNBLHVCQUFDLGFBQVUsT0FBTSx3QkFBdUIsV0FBUyxNQUFDLFNBQVMsR0FBRyxPQUFPbUYsWUFBWSxVQUFVLENBQUF6RCxVQUFTMEQsY0FBYzFELE1BQU1DLE9BQU8zQixLQUFLLEtBQXBJO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXNJO0FBQUEsWUFDdEksdUJBQUMsU0FBTSxVQUFTLFFBQU8sK0ZBQXZCO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQXNHO0FBQUEsZUFQMUc7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFRQTtBQUFBO0FBQUE7QUFBQSxNQWhDSjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFpQ0E7QUFBQSxPQTNHSjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBNEdBLEtBOUdSO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FnSEE7QUFFUjtBQUFDdUUsSUFwSlFELG1CQUFpQjtBQUFBLFVBR0x0RyxVQUNBbkIsaUJBQ1BpQixRQUVPQSxRQUNBQyxZQUNEQSxZQUNBQSxZQUNDQSxVQUFVO0FBQUE7QUFBQSxNQVh0QnVHO0FBcUpULFNBQVNvRCxtQkFBbUI7QUFBQUMsTUFBQTtBQUN4QixRQUFNLENBQUNDLE1BQU1DLE9BQU8sSUFBSXJMLFNBQVMsS0FBSztBQUN0QyxTQUFPLHVCQUFDLGtCQUFlLFdBQVUsV0FDN0I7QUFBQSwyQkFBQyxTQUFNLFVBQVMsUUFBTyxRQUFRLHVCQUFDLFVBQU8sTUFBSyxTQUFRLFNBQVMsTUFBTXFMLFFBQVEsQ0FBQTdILFVBQVMsQ0FBQ0EsS0FBSyxHQUFJNEgsaUJBQU8saUJBQWlCLDhCQUF2RjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQWtILEdBQVUsNElBQTNKO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FFQTtBQUFBLElBQ0NBLFFBQVEsdUJBQUMsU0FBTSxNQUFLLFVBQVMsZUFBWSxzQkFBcUIsSUFBSSxDQUFDM0ksU0FBU2tFLFFBQVFDLG1CQUFtQm5FLFNBQVNrRSxRQUFRMkUsY0FBYyxFQUFFQyxRQUFRLEdBQUduRixhQUFhLFdBQVdlLGNBQWNsSCxTQUFTbUgsT0FBT29FLFFBQVEsQ0FBQyxHQUMvTTtBQUFBLDZCQUFDLE9BQUksTUFBSyxPQUFNLGNBQVcsOENBQTZDLElBQUksRUFBRXpHLFdBQVcsSUFBSUMsU0FBUyxRQUFReUcsWUFBWSxVQUFVdEUsY0FBY2xILFNBQVNtSCxPQUFPb0UsU0FBU25GLFNBQVMsZUFBZSxHQUMvTCxpQ0FBQyxjQUFXLFNBQVEsU0FBUSxzREFBNUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFrRSxLQUR0RTtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRUE7QUFBQSxNQUNBLHVCQUFDLGNBQVcsU0FBUSxTQUFRLFlBQVlwRyxTQUFTNEcsV0FBV0MsV0FBV0MsUUFBUSwwREFBL0U7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUF5SDtBQUFBLE1BQ3pILHVCQUFDLGNBQVcsU0FBUSxXQUFVLE9BQU0sa0JBQWlCLDJGQUFyRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWdJO0FBQUEsU0FMM0g7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQU1UO0FBQUEsT0FWRztBQUFBO0FBQUE7QUFBQTtBQUFBLFNBV1A7QUFDSjtBQUFDb0UsSUFkUUQsa0JBQWdCO0FBQUEsTUFBaEJBO0FBdUJULE1BQU1RLHFCQUFxQjtBQUFBLEVBQ3ZCQyxTQUFTO0FBQUEsSUFDTEMsT0FBTztBQUFBLElBQ1BDLFdBQVcsQ0FBQyw4Q0FBOEMsb0NBQW9DLGlEQUFpRDtBQUFBLElBQy9JQyxVQUFVO0FBQUEsRUFDZDtBQUFBLEVBQ0FDLFFBQVE7QUFBQSxJQUNKSCxPQUFPO0FBQUEsSUFDUEMsV0FBVyxDQUFDLDBDQUEwQyxrREFBa0QsZ0RBQWdEO0FBQUEsSUFDeEpDLFVBQVU7QUFBQSxFQUNkO0FBQUEsRUFDQUUsTUFBTTtBQUFBLElBQ0ZKLE9BQU87QUFBQSxJQUNQQyxXQUFXLENBQUMsK0NBQStDLHFEQUFxRCw2Q0FBNkM7QUFBQSxJQUM3SkMsVUFBVTtBQUFBLEVBQ2Q7QUFDSjtBQUVBLFNBQVNHLHFCQUFxQixFQUFFM0IsWUFBWXZILGVBQStELEdBQUc7QUFBQW1KLE1BQUE7QUFDMUcsUUFBTSxFQUFFbEosS0FBSyxJQUFJeEIsU0FBUztBQUMxQixRQUFNMkssaUJBQWlCMUssT0FBTyxjQUFjO0FBQzVDLFFBQU0ySyxtQkFBbUIzSyxPQUFPLGdCQUFnQjtBQUNoRCxRQUFNNEssV0FBVy9LLE9BQU8sZ0JBQWdCLEVBQUUyQyxPQUFPLEVBQUVDLE9BQU8sSUFBSSxFQUFFLEdBQUdpSSxjQUFjO0FBQ2pGLFFBQU1HLFFBQVFoTCxPQUFPLHNCQUFzQixFQUFFMkMsT0FBTyxFQUFFQyxPQUFPLElBQUksRUFBRSxHQUFHa0ksZ0JBQWdCO0FBQ3RGLFFBQU0sQ0FBQ0csS0FBS0MsTUFBTSxJQUFJeE0sU0FBMEIsUUFBUTtBQUN4RCxRQUFNLENBQUN5TSxVQUFVQyxXQUFXLElBQUkxTSxTQUEwQyxTQUFTO0FBQ25GLFFBQU0yTSxTQUFTakIsbUJBQW1CZSxRQUFRO0FBQzFDLFFBQU1HLGNBQWNQLFNBQVMvRyxNQUFNQSxRQUFRLElBQUl1SCxPQUFPLENBQUFDLFlBQVdBLFFBQVFySixXQUFXLFFBQVEsRUFDdkZzSixRQUF3QixDQUFBRCxZQUFXQSxRQUFRRSxTQUFTSCxPQUFPLENBQUFJLFlBQVdBLFFBQVFDLFVBQVVELFFBQVFFLEtBQUssRUFDakdKLFFBQVEsQ0FBQUUsYUFBWVgsTUFBTWhILE1BQU1BLFFBQVEsSUFBSXVILE9BQU8sQ0FBQU8sYUFBWUEsU0FBU0MsY0FBY0osUUFBUXZJLEVBQUUsRUFDNUZjLElBQUksQ0FBQTRILGNBQWEsRUFBRWhKLEtBQUssR0FBRzZJLFFBQVF2SSxFQUFFLElBQUkwSSxTQUFTRSxXQUFXLElBQUlSLFNBQVNHLFNBQVNHLFNBQVMsRUFBRSxDQUFDLENBQUM7QUFFN0csU0FBTyx1QkFBQyxTQUFNLE9BQU0seUNBQXdDLFVBQVMsa0VBQWlFLFdBQVUsV0FBVSxVQUFTLFNBQy9KLGlDQUFDLGtCQUNHO0FBQUEsMkJBQUMsU0FBTSxVQUFTLFFBQU8sNkhBQXZCO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBb0k7QUFBQSxJQUNwSSx1QkFBQyxRQUFLLE9BQU9iLEtBQUssVUFBVSxDQUFDZ0IsR0FBRy9KLFVBQTJCZ0osT0FBT2hKLEtBQUssR0FBRyxTQUFRLGNBQWEsZUFBYyxRQUFPLGNBQVcsZ0NBQzNIO0FBQUEsNkJBQUMsT0FBSSxPQUFNLFVBQVMsT0FBTSxjQUExQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQW9DO0FBQUEsTUFDcEMsdUJBQUMsT0FBSSxPQUFNLFdBQVUsT0FBTSxlQUEzQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXNDO0FBQUEsTUFDdEMsdUJBQUMsT0FBSSxPQUFNLFNBQVEsT0FBTSxhQUF6QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWtDO0FBQUEsTUFDbEMsdUJBQUMsT0FBSSxPQUFNLGdCQUFlLE9BQU0sY0FBaEM7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUEwQztBQUFBLFNBSjlDO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FLQTtBQUFBLElBQ0MrSSxRQUFRLFlBQVksdUJBQUMsa0JBQWdCLE1BQUssWUFBVyxjQUFXLHVCQUM3RDtBQUFBLDZCQUFDLGFBQVUsUUFBTSxNQUFDLE9BQU0sa0JBQWlCLE9BQU9FLFVBQVUsVUFBVSxDQUFBdkgsVUFBU3dILFlBQVl4SCxNQUFNQyxPQUFPM0IsS0FBd0MsR0FDeklnSyxpQkFBT0MsUUFBUS9CLGtCQUFrQixFQUFFbEcsSUFBSSxDQUFDLENBQUNwQixLQUFLWixLQUFLLE1BQU0sdUJBQUMsWUFBbUIsT0FBT1ksS0FBTVosZ0JBQU1vSSxTQUF4QnhILEtBQWY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUE2QyxDQUFXLEtBRHRIO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFFQTtBQUFBLE1BQ0EsdUJBQUMsY0FBVyxXQUFVLE1BQUssU0FBUSxhQUFZLDZCQUEvQztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQTREO0FBQUEsTUFDM0R1SSxPQUFPZCxVQUFVckcsSUFBSSxDQUFDa0ksVUFBVUMsVUFBVSx1QkFBQyxjQUEwQixTQUFRLFNBQVNBO0FBQUFBLGdCQUFRO0FBQUEsUUFBRTtBQUFBLFFBQUdEO0FBQUFBLFdBQXhDQSxVQUFqQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWtFLENBQWE7QUFBQSxNQUMxSCx1QkFBQyxTQUFNLFVBQVMsV0FBVTtBQUFBO0FBQUEsUUFBZ0JmLE9BQU9iO0FBQUFBLFdBQWpEO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBMEQ7QUFBQSxNQUMxRCx1QkFBQyxjQUFXLFNBQVEsV0FBVSxPQUFNLGtCQUFpQixnR0FBckQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFxSTtBQUFBLFNBUHBIO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FRckI7QUFBQSxJQUNDUyxRQUFRLGFBQWEsdUJBQUMsa0JBQWdCLE1BQUssWUFBVyxjQUFXLGtDQUM5RDtBQUFBLDZCQUFDLFNBQU0sVUFBUyxRQUFPLGlJQUF2QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXdJO0FBQUEsTUFDdkksQ0FBQ0osa0JBQWtCLENBQUNDLG1CQUNmLHVCQUFDLFNBQU0sVUFBUyxXQUFVLHFFQUExQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQStFLElBQy9FLHVCQUFDLGNBQVcsT0FBT0MsVUFBVSxnQkFBZSxXQUFXQSxtQkFBUy9HLFFBQVEsdUJBQUMsY0FBVyxPQUFPZ0gsT0FBTyxnQkFBZSxXQUFXQSxnQkFBTWhILFFBQVEsbUNBQzVJO0FBQUEsK0JBQUMsYUFBVSxPQUFNLGtDQUFpQyxNQUFNc0gsWUFBWSxRQUFRLENBQUFnQixRQUFPQSxJQUFJeEosS0FBSyxPQUFNLDZDQUE0QyxTQUFTO0FBQUEsVUFDbkosRUFBRUEsS0FBSyxXQUFXd0gsT0FBTyxZQUFZaUMsUUFBUUEsQ0FBQUQsUUFBT0EsSUFBSWQsUUFBUWdCLEtBQUs7QUFBQSxVQUNyRSxFQUFFMUosS0FBSyxPQUFPd0gsT0FBTyxPQUFPaUMsUUFBUUEsQ0FBQUQsUUFBT0EsSUFBSVgsUUFBUWMsSUFBSTtBQUFBLFVBQzNELEVBQUUzSixLQUFLLFNBQVN3SCxPQUFPLE9BQU9vQyxPQUFPLFNBQVNILFFBQVFBLENBQUFELFFBQU8sdUJBQUMsVUFBTyxPQUFPQSxJQUFJWCxRQUFRRSxTQUEzQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFpQyxFQUFJO0FBQUEsVUFDbEcsRUFBRS9JLEtBQUssYUFBYXdILE9BQU8sY0FBY29DLE9BQU8sU0FBU0gsUUFBUUEsQ0FBQUQsUUFBT0EsSUFBSVIsU0FBU2EsVUFBVTtBQUFBLFVBQy9GLEVBQUU3SixLQUFLLFFBQVF3SCxPQUFPLGdCQUFnQmlDLFFBQVFBLENBQUFELFFBQU9sTSxTQUFTa00sSUFBSVIsU0FBU2MsTUFBTWxMLEtBQUttSCxRQUFRLEVBQUU7QUFBQSxRQUFDLEtBTHJHO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFNRTtBQUFBLFFBQ0YsdUJBQUMsY0FBVyxTQUFRLFdBQVUsT0FBTSxrQkFBaUIsc0dBQXJEO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBMkk7QUFBQSxRQUMzSSx1QkFBQyxlQUFZLFdBQVUsT0FBTSxTQUFRLGVBQWM7QUFBQSxpQ0FBQyxhQUFVLElBQUksTUFBTW5ILEtBQUswQixFQUFFLGFBQWEscUNBQXpDO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQThEO0FBQUEsVUFBWSx1QkFBQyxhQUFVLElBQUksTUFBTTFCLEtBQUswQixFQUFFLGNBQWMsb0NBQTFDO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQThEO0FBQUEsYUFBM0w7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUF1TTtBQUFBLFdBVDNEO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFVNUksS0FWMEU7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQVV0RSxLQVZGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFVZ0I7QUFBQSxTQWRKO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FldEI7QUFBQSxJQUNDNkgsUUFBUSxXQUFXLHVCQUFDLGtCQUFnQixNQUFLLFlBQVcsY0FBVyx3QkFDNUQ7QUFBQSw2QkFBQyxjQUFXLFNBQVEsU0FBUSxvR0FBNUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFnSDtBQUFBLE1BQ2hILHVCQUFDLGFBQVUsSUFBSSxNQUFNdkosS0FBSzBCLEVBQUUsMEJBQTBCNEYsVUFBVSxtQkFBbUJ2SCxjQUFjLElBQUksZ0RBQXJHO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBcUk7QUFBQSxNQUNySSx1QkFBQyxTQUFNLFVBQVMsUUFBTyxnR0FBdkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUF1RztBQUFBLFNBSHZGO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FJcEI7QUFBQSxJQUNDd0osUUFBUSxrQkFBa0IsdUJBQUMsa0JBQWdCLE1BQUssWUFBVyxjQUFXLDBCQUNuRTtBQUFBLDZCQUFDLFNBQU0sVUFBUyxXQUFVLCtLQUExQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXlMO0FBQUEsTUFDekwsdUJBQUMsVUFBTyxTQUFRLFlBQVcsVUFBUSxNQUFDLHFEQUFwQztBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXlFO0FBQUEsTUFDekUsdUJBQUMsY0FBVyxTQUFRLFdBQVUsT0FBTSxrQkFBaUIsK0ZBQXJEO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBb0k7QUFBQSxTQUg3RztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBSTNCO0FBQUEsT0ExQ0o7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQTJDQSxLQTVDRztBQUFBO0FBQUE7QUFBQTtBQUFBLFNBNkNQO0FBQ0o7QUFBQ0wsSUE1RFFELHNCQUFvQjtBQUFBLFVBQ1J6SyxVQUNNQyxRQUNFQSxRQUNSSCxRQUNIQSxNQUFNO0FBQUE7QUFBQSxNQUxmMks7QUE4RFQsU0FBU2tDLG9CQUFvQjtBQUFBQyxNQUFBO0FBQ3pCLFFBQU0sQ0FBQ2hELE1BQU1DLE9BQU8sSUFBSXJMLFNBQVMsS0FBSztBQUN0QyxTQUFPLHVCQUFDLGtCQUFlLFdBQVUsV0FDN0I7QUFBQSwyQkFBQyxjQUFXLFdBQVUsTUFBSyxTQUFRLGFBQVksaURBQS9DO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBZ0Y7QUFBQSxJQUNoRix1QkFBQyxTQUFNLFVBQVMsUUFBTyw0SUFBdkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFtSjtBQUFBLElBQ25KLHVCQUFDLFVBQU8sTUFBSyxTQUFRLFNBQVEsWUFBVyxTQUFTLE1BQU1xTCxRQUFRLENBQUE3SCxVQUFTLENBQUNBLEtBQUssR0FBSTRILGlCQUFPLHFCQUFxQiw2QkFBOUc7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUF3STtBQUFBLElBQ3ZJQSxRQUFRLHVCQUFDLFNBQU0sTUFBSyxVQUFTLGVBQVksMEJBQXlCLElBQUksQ0FBQzNJLFNBQVNrRSxRQUFRQyxtQkFBbUJuRSxTQUFTa0UsUUFBUTJFLGNBQWMsRUFBRUMsUUFBUSxHQUFHbkYsYUFBYSxXQUFXZSxjQUFjbEgsU0FBU21ILE9BQU9vRSxRQUFRLENBQUMsR0FDbk47QUFBQSw2QkFBQyxjQUFXLFdBQVUsTUFBSyxTQUFRLGFBQVkseUNBQS9DO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBd0U7QUFBQSxNQUN4RSx1QkFBQyxjQUFXLFNBQVEsU0FBUSxxRkFBNUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFpRztBQUFBLE1BQ2pHLHVCQUFDLGNBQVcsU0FBUSxXQUFVLE9BQU0sa0JBQWlCLDZGQUFyRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWtJO0FBQUEsU0FIN0g7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUlUO0FBQUEsT0FSRztBQUFBO0FBQUE7QUFBQTtBQUFBLFNBU1A7QUFDSjtBQUFDNEMsSUFaUUQsbUJBQWlCO0FBQUEsTUFBakJBO0FBQWlCLElBQUFFLElBQUFDLEtBQUFDLEtBQUFDLEtBQUFDO0FBQUEsYUFBQUosSUFBQTtBQUFBLGFBQUFDLEtBQUE7QUFBQSxhQUFBQyxLQUFBO0FBQUEsYUFBQUMsS0FBQTtBQUFBLGFBQUFDLEtBQUEiLCJuYW1lcyI6WyJBY3Rpb25Hcm91cCIsIkZpZWxkR3JvdXAiLCJGb3JtRmllbGRzIiwiU2VjdGlvbkdyaWQiLCJTdXJmYWNlQ29udGVudCIsInVzZUVmZmVjdCIsInVzZVJlZiIsInVzZVN0YXRlIiwidmlzdWFsU3giLCJMaW5rIiwiUm91dGVyTGluayIsInVzZVBhcmFtcyIsInVzZVNlYXJjaFBhcmFtcyIsIkFsZXJ0IiwiQXZhdGFyIiwiQm94IiwiQnV0dG9uIiwiTGlzdCIsIkxpc3RJdGVtIiwiTGlzdEl0ZW1CdXR0b24iLCJNZW51SXRlbSIsIlN0YWNrIiwiVGFiIiwiVGFicyIsIlRleHRGaWVsZCIsIlR5cG9ncmFwaHkiLCJBcnJvd0JhY2tSb3VuZGVkIiwiY29sb3JzIiwidG9rZW5zIiwidXNlQXBpIiwidXNlQ29tbWFuZCIsInVzZVNjb3BlIiwidXNlQ2FuIiwiZGF0ZVRpbWUiLCJQYWdlSGVhZGVyIiwiUGFuZWwiLCJRdWVyeVN0YXRlIiwiVG9vbGJhciIsIlBhZ2VyIiwiU3RhdHVzIiwiTXV0YXRpb25CdXR0b24iLCJFZGl0RGlhbG9nIiwiRXJyb3JOb3RpY2UiLCJDb25maXJtRGlhbG9nIiwiUm91dGVMaW5rIiwiRW1wdHkiLCJEYXRhVGFibGUiLCJBbW91bnQiLCJsYXlvdXRTeCIsIkNvbnZlcnNhdGlvbkNvbXBvc2VyIiwiQ29udmVyc2F0aW9uQ29udGV4dFBhbmVsIiwiQ29udmVyc2F0aW9uTWVzc2FnZUxpc3QiLCJJbmJveFBhZ2UiLCJfcyIsImNvbnZlcnNhdGlvbklkIiwic2hvcCIsInBhcmFtcyIsInNldFBhcmFtcyIsInEiLCJnZXQiLCJyYXdNb2RlIiwibW9kZSIsImZpbmQiLCJ2YWx1ZSIsInN0YXR1cyIsImNoYW5uZWxJZCIsInVuZGVmaW5lZCIsImFzc2lnbmVkVXNlcklkIiwibGlzdEN1cnNvclBhcmFtIiwiY3Vyc29yIiwibWV0YWRhdGEiLCJsaXN0IiwicXVlcnkiLCJsaW1pdCIsInVwZGF0ZUZpbHRlciIsImtleSIsIm5leHQiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZXQiLCJkZWxldGUiLCJkZXRhaWxIcmVmIiwiaWQiLCJsaXN0Q3Vyc29yIiwidG9TdHJpbmciLCJ4cyIsImxnIiwibWluSGVpZ2h0IiwiZGlzcGxheSIsInNtIiwiZXZlbnQiLCJ0YXJnZXQiLCJmbGV4IiwibWluV2lkdGgiLCJkYXRhIiwiY2hhbm5lbHMiLCJtYXAiLCJjaGFubmVsIiwiZGlzcGxheU5hbWUiLCJhc3NpZ25lZXMiLCJhc3NpZ25lZSIsInVzZXJJZCIsImMiLCJpbmJveCIsImxpc3RJbnNldCIsImxpc3RDb250ZW50R2FwIiwiYWxpZ25JdGVtcyIsImJvcmRlckJvdHRvbSIsImJvcmRlckNvbG9yIiwiYmdjb2xvciIsInJhaXNlZCIsImNvbG9yIiwid2lkdGgiLCJoZWlnaHQiLCJzbGljZSIsInN1cmZhY2UiLCJjb21wYWN0Q29udGVudEdhcCIsInR5cG9ncmFwaHkiLCJmb250V2VpZ2h0Iiwic3Ryb25nIiwidW5yZWFkQ291bnQiLCJ1bnJlYWRDb3VudEluc2V0Iiwib25BY2NlbnQiLCJib3JkZXJSYWRpdXMiLCJyYWRpdXMiLCJsYXJnZSIsImZvbnRTaXplIiwiZm9udFNpemVzIiwibWV0YSIsInRpdGxlRGVzY3JpcHRpb25HYXAiLCJsYXN0TWVzc2FnZVByZXZpZXciLCJsaXN0U3RhdHVzQmVmb3JlR2FwIiwibGVuZ3RoIiwicGFnZSIsIkNvbnZlcnNhdGlvblBhbmVsIiwiX3MyIiwicGF0aCIsIm1lc3NhZ2VDdXJzb3IiLCJtZXNzYWdlcyIsInRha2VvdmVyIiwicmVsZWFzZSIsInJlc29sdmUiLCJmZWVkYmFjayIsImFjdGlvbiIsInNldEFjdGlvbiIsInJhdGluZ01lc3NhZ2UiLCJzZXRSYXRpbmdNZXNzYWdlIiwiY29ycmVjdGlvbiIsInNldENvcnJlY3Rpb24iLCJyYXRpbmciLCJzZXRSYXRpbmciLCJlbmQiLCJjdXJyZW50Iiwic2Nyb2xsSW50b1ZpZXciLCJibG9jayIsImJlaGF2aW9yIiwiaW5ib3hIcmVmIiwiY29udmVyc2F0aW9uIiwieGwiLCJmbGV4RGlyZWN0aW9uIiwiZmxleFdyYXAiLCJzZWxlY3RlZCIsInNlbmRFbGlnaWJpbGl0eSIsInN0YXRlIiwicGFuZUluc2V0IiwicmVhc29uQ29kZSIsIm1heEhlaWdodCIsIm92ZXJmbG93WSIsImJhY2tncm91bmQiLCJjYW52YXMiLCJtZXNzYWdlR3JvdXBHYXAiLCJ0aW1lem9uZSIsIm1lc3NhZ2UiLCJfX01PQ0tfXyIsImN1c3RvbWVySWQiLCJwZW5kaW5nIiwiZXJyb3IiLCJyZWFzb24iLCJvcGVyYXRpb24iLCJleGVjdXRlIiwidmVyc2lvbiIsImJvZHkiLCJleHBlY3RlZFZlcnNpb24iLCJtZXNzYWdlSWQiLCJ3aGl0ZVNwYWNlIiwidGV4dCIsIk1vY2tNZWRpYVByZXZpZXciLCJfczMiLCJvcGVuIiwic2V0T3BlbiIsImNvbXBhY3RJbnNldCIsImJvcmRlciIsImNvbnRyb2wiLCJwbGFjZUl0ZW1zIiwic2FtcGxlU2FsZXNTY3JpcHRzIiwiZmFzaGlvbiIsImxhYmVsIiwicXVlc3Rpb25zIiwiYm91bmRhcnkiLCJiZWF1dHkiLCJob21lIiwiTW9ja1NhbGVzRmxvd1ByZXZpZXciLCJfczQiLCJjYW5SZWFkQ2F0YWxvZyIsImNhblJlYWRJbnZlbnRvcnkiLCJwcm9kdWN0cyIsInN0b2NrIiwidGFiIiwic2V0VGFiIiwiaW5kdXN0cnkiLCJzZXRJbmR1c3RyeSIsInNjcmlwdCIsInNvdXJjZVJvd3MiLCJmaWx0ZXIiLCJwcm9kdWN0IiwiZmxhdE1hcCIsInZhcmlhbnRzIiwidmFyaWFudCIsImFjdGl2ZSIsInByaWNlIiwic25hcHNob3QiLCJ2YXJpYW50SWQiLCJ3YXJlaG91c2VJZCIsIl8iLCJPYmplY3QiLCJlbnRyaWVzIiwicXVlc3Rpb24iLCJpbmRleCIsInJvdyIsInJlbmRlciIsIm5hbWUiLCJza3UiLCJhbGlnbiIsImF2YWlsYWJsZSIsImFzT2YiLCJNb2NrVXBzZWxsUHJldmlldyIsIl9zNSIsIl9jIiwiX2MyIiwiX2MzIiwiX2M0IiwiX2M1Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbImluZGV4LnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBY3Rpb25Hcm91cCwgRmllbGRHcm91cCwgRm9ybUZpZWxkcywgU2VjdGlvbkdyaWQsIFN1cmZhY2VDb250ZW50IH0gZnJvbSAnLi4vLi4vc2hhcmVkL3VpL2NvbXBvc2l0aW9uJztcbmltcG9ydCB7IHVzZUVmZmVjdCwgdXNlUmVmLCB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IHZpc3VhbFN4IH0gZnJvbSAnQC9zaGFyZWQvdWkvdmlzdWFsJztcbmltcG9ydCB7IExpbmsgYXMgUm91dGVyTGluaywgdXNlUGFyYW1zLCB1c2VTZWFyY2hQYXJhbXMgfSBmcm9tICdyZWFjdC1yb3V0ZXItZG9tJztcbmltcG9ydCB7IEFsZXJ0LCBBdmF0YXIsIEJveCwgQnV0dG9uLCBMaXN0LCBMaXN0SXRlbSwgTGlzdEl0ZW1CdXR0b24sIE1lbnVJdGVtLCBTdGFjaywgVGFiLCBUYWJzLCBUZXh0RmllbGQsIFR5cG9ncmFwaHkgfSBmcm9tICdAbXVpL21hdGVyaWFsJztcbmltcG9ydCBBcnJvd0JhY2tSb3VuZGVkIGZyb20gJ0BtdWkvaWNvbnMtbWF0ZXJpYWwvQXJyb3dCYWNrUm91bmRlZCc7XG5pbXBvcnQgdHlwZSB7IE1lc3NhZ2UsIFByb2R1Y3QsIFN0b2NrU25hcHNob3QgfSBmcm9tICdAYm90c2FsZXMvY29udHJhY3RzJztcbmltcG9ydCB7IGNvbG9ycywgdG9rZW5zIH0gZnJvbSAnQGJvdHNhbGVzL3Rva2Vucyc7XG5pbXBvcnQgeyB1c2VBcGksIHVzZUNvbW1hbmQgfSBmcm9tICdAL3NoYXJlZC9hcGkvaG9va3MnO1xuaW1wb3J0IHsgdXNlU2NvcGUsIHVzZUNhbiB9IGZyb20gJ0Avc2hhcmVkL21vZGVsL3Njb3BlJztcbmltcG9ydCB7IGRhdGVUaW1lIH0gZnJvbSAnQC9zaGFyZWQvbW9kZWwvZm9ybWF0JztcbmltcG9ydCB7IFBhZ2VIZWFkZXIsIFBhbmVsLCBRdWVyeVN0YXRlLCBUb29sYmFyLCBQYWdlciwgU3RhdHVzLCBNdXRhdGlvbkJ1dHRvbiwgRWRpdERpYWxvZywgRXJyb3JOb3RpY2UsIENvbmZpcm1EaWFsb2csIFJvdXRlTGluaywgRW1wdHksIERhdGFUYWJsZSwgQW1vdW50IH0gZnJvbSAnQC9zaGFyZWQvdWkvY29tcG9uZW50cyc7XG5pbXBvcnQgeyBsYXlvdXRTeCB9IGZyb20gJ0Avc2hhcmVkL3VpL2xheW91dCc7XG5pbXBvcnQgeyBDb252ZXJzYXRpb25Db21wb3NlciwgQ29udmVyc2F0aW9uQ29udGV4dFBhbmVsLCBDb252ZXJzYXRpb25NZXNzYWdlTGlzdCB9IGZyb20gJy4vY29udmVyc2F0aW9uLWNvbXBvbmVudHMnO1xuZXhwb3J0IGZ1bmN0aW9uIEluYm94UGFnZSgpIHtcbiAgICBjb25zdCB7IGNvbnZlcnNhdGlvbklkIH0gPSB1c2VQYXJhbXMoKTtcbiAgICBjb25zdCB7IHNob3AgfSA9IHVzZVNjb3BlKCk7XG4gICAgY29uc3QgW3BhcmFtcywgc2V0UGFyYW1zXSA9IHVzZVNlYXJjaFBhcmFtcygpO1xuICAgIGNvbnN0IHEgPSBwYXJhbXMuZ2V0KCdxJykgfHwgJyc7XG4gICAgY29uc3QgcmF3TW9kZSA9IHBhcmFtcy5nZXQoJ21vZGUnKTtcbiAgICBjb25zdCBtb2RlID0gKFsnYm90JywgJ2h1bWFuJywgJ3BhdXNlZCddIGFzIGNvbnN0KS5maW5kKHZhbHVlID0+IHZhbHVlID09PSByYXdNb2RlKTtcbiAgICBjb25zdCBzdGF0dXMgPSAoWydvcGVuJywgJ3Jlc29sdmVkJ10gYXMgY29uc3QpLmZpbmQodmFsdWUgPT4gdmFsdWUgPT09IHBhcmFtcy5nZXQoJ3N0YXR1cycpKTtcbiAgICBjb25zdCBjaGFubmVsSWQgPSBwYXJhbXMuZ2V0KCdjaGFubmVsSWQnKSB8fCB1bmRlZmluZWQ7XG4gICAgY29uc3QgYXNzaWduZWRVc2VySWQgPSBwYXJhbXMuZ2V0KCdhc3NpZ25lZFVzZXJJZCcpIHx8IHVuZGVmaW5lZDtcbiAgICBjb25zdCBsaXN0Q3Vyc29yUGFyYW0gPSBjb252ZXJzYXRpb25JZCA/ICdsaXN0Q3Vyc29yJyA6ICdjdXJzb3InO1xuICAgIGNvbnN0IGN1cnNvciA9IHBhcmFtcy5nZXQobGlzdEN1cnNvclBhcmFtKSB8fCB1bmRlZmluZWQ7XG4gICAgY29uc3QgbWV0YWRhdGEgPSB1c2VBcGkoJ2dldEluYm94TWV0YWRhdGEnKTtcbiAgICBjb25zdCBsaXN0ID0gdXNlQXBpKCdsaXN0Q29udmVyc2F0aW9ucycsIHsgcXVlcnk6IHsgcTogcSB8fCB1bmRlZmluZWQsIHN0YXR1cywgbW9kZSwgY2hhbm5lbElkLCBhc3NpZ25lZFVzZXJJZCwgY3Vyc29yLCBsaW1pdDogNDAgfSB9KTtcbiAgICBjb25zdCB1cGRhdGVGaWx0ZXIgPSAoa2V5OiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpID0+IHtcbiAgICAgICAgY29uc3QgbmV4dCA9IG5ldyBVUkxTZWFyY2hQYXJhbXMocGFyYW1zKTtcbiAgICAgICAgaWYgKHZhbHVlKVxuICAgICAgICAgICAgbmV4dC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIG5leHQuZGVsZXRlKGtleSk7XG4gICAgICAgIG5leHQuZGVsZXRlKGxpc3RDdXJzb3JQYXJhbSk7XG4gICAgICAgIHNldFBhcmFtcyhuZXh0KTtcbiAgICB9O1xuICAgIGNvbnN0IGRldGFpbEhyZWYgPSAoaWQ6IHN0cmluZykgPT4ge1xuICAgICAgICBjb25zdCBuZXh0ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhwYXJhbXMpO1xuICAgICAgICBjb25zdCBsaXN0Q3Vyc29yID0gbmV4dC5nZXQobGlzdEN1cnNvclBhcmFtKTtcbiAgICAgICAgbmV4dC5kZWxldGUoJ2N1cnNvcicpO1xuICAgICAgICBuZXh0LmRlbGV0ZSgnbGlzdEN1cnNvcicpO1xuICAgICAgICBpZiAobGlzdEN1cnNvcilcbiAgICAgICAgICAgIG5leHQuc2V0KCdsaXN0Q3Vyc29yJywgbGlzdEN1cnNvcik7XG4gICAgICAgIGNvbnN0IHF1ZXJ5ID0gbmV4dC50b1N0cmluZygpO1xuICAgICAgICByZXR1cm4gYC9zLyR7c2hvcC5pZH0vaW5ib3gvJHtpZH0ke3F1ZXJ5ID8gYD8ke3F1ZXJ5fWAgOiAnJ31gO1xuICAgIH07XG4gICAgcmV0dXJuIDw+XG4gICAgICAgIDxQYWdlSGVhZGVyIHRpdGxlPVwiSOG7mXAgdGjGsCBraMOhY2ggaMOgbmdcIiBzdWJ0aXRsZT1cIkFJIHbDoCBuaMOibiB2acOqbiB0aeG6v3AgcXXhuqNuIHLDtSByw6BuZzsgY2jhu4kgZ+G7rWkga2hpIGNow61uaCBzw6FjaCBrw6puaCBjaG8gcGjDqXAuXCIgLz5cbiAgICAgICAgPFNlY3Rpb25HcmlkIGNvbHVtbnM9e3sgeHM6ICcxZnInLCBsZzogJzMwMHB4IG1pbm1heCgwLDFmciknIH19IGdlb21ldHJ5PXt7bWluSGVpZ2h0OiA2NTB9fT5cbiAgICAgICAgICAgIDxQYW5lbCBnZW9tZXRyeT17eyBkaXNwbGF5OiB7IHhzOiBjb252ZXJzYXRpb25JZCA/ICdub25lJyA6ICdibG9jaycsIGxnOiAnYmxvY2snIH0gfX0+XG4gICAgICAgICAgICAgICAgPFRvb2xiYXIgb3BlcmF0aW9uPVwibGlzdENvbnZlcnNhdGlvbnNcIiBwbGFjZWhvbGRlcj1cIlTDrG0gaOG7mWkgdGhv4bqhaeKAplwiIGN1cnNvclBhcmFtPXtsaXN0Q3Vyc29yUGFyYW19IGZpbHRlcnM9e1xuICAgICAgICAgICAgICAgIDxGaWVsZEdyb3VwIGRpcmVjdGlvbj17eyB4czogJ2NvbHVtbicsIHNtOiAncm93JyB9fSBmbGV4V3JhcD1cIndyYXBcIiByb2xlPVwiZ3JvdXBcIiBhcmlhLWxhYmVsPVwiQuG7mSBs4buNYyBo4buZaSB0aG/huqFpXCI+XG4gICAgICAgICAgICAgICAgICAgIDxUZXh0RmllbGQgc2VsZWN0IHNpemU9XCJzbWFsbFwiIGxhYmVsPVwiVHLhuqFuZyB0aMOhaVwiIHZhbHVlPXtzdGF0dXMgfHwgJyd9IG9uQ2hhbmdlPXtldmVudCA9PiB1cGRhdGVGaWx0ZXIoJ3N0YXR1cycsIGV2ZW50LnRhcmdldC52YWx1ZSl9IHN4PXt7IGZsZXg6IDEsIG1pbldpZHRoOiAxNDAgfX0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8TWVudUl0ZW0gdmFsdWU9XCJcIj5U4bqldCBj4bqjIHRy4bqhbmcgdGjDoWk8L01lbnVJdGVtPjxNZW51SXRlbSB2YWx1ZT1cIm9wZW5cIj7EkGFuZyBt4bufPC9NZW51SXRlbT48TWVudUl0ZW0gdmFsdWU9XCJyZXNvbHZlZFwiPsSQw6MgZ2nhuqNpIHF1eeG6v3Q8L01lbnVJdGVtPlxuICAgICAgICAgICAgICAgICAgICA8L1RleHRGaWVsZD5cbiAgICAgICAgICAgICAgICAgICAgPFRleHRGaWVsZCBzZWxlY3Qgc2l6ZT1cInNtYWxsXCIgbGFiZWw9XCJDaOG6vyDEkeG7mVwiIHZhbHVlPXttb2RlIHx8ICcnfSBvbkNoYW5nZT17ZXZlbnQgPT4gdXBkYXRlRmlsdGVyKCdtb2RlJywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gc3g9e3sgZmxleDogMSwgbWluV2lkdGg6IDE0MCB9fT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxNZW51SXRlbSB2YWx1ZT1cIlwiPlThuqV0IGPhuqMgY2jhur8gxJHhu5k8L01lbnVJdGVtPjxNZW51SXRlbSB2YWx1ZT1cImJvdFwiPkJvdDwvTWVudUl0ZW0+PE1lbnVJdGVtIHZhbHVlPVwiaHVtYW5cIj5OaMOibiB2acOqbjwvTWVudUl0ZW0+PE1lbnVJdGVtIHZhbHVlPVwicGF1c2VkXCI+VOG6oW0gZOG7q25nPC9NZW51SXRlbT5cbiAgICAgICAgICAgICAgICAgICAgPC9UZXh0RmllbGQ+XG4gICAgICAgICAgICAgICAgICAgIDxUZXh0RmllbGQgc2VsZWN0IHNpemU9XCJzbWFsbFwiIGxhYmVsPVwiS8OqbmhcIiB2YWx1ZT17Y2hhbm5lbElkIHx8ICcnfSBvbkNoYW5nZT17ZXZlbnQgPT4gdXBkYXRlRmlsdGVyKCdjaGFubmVsSWQnLCBldmVudC50YXJnZXQudmFsdWUpfSBzeD17eyBmbGV4OiAxLCBtaW5XaWR0aDogMTYwIH19PlxuICAgICAgICAgICAgICAgICAgICAgICAgPE1lbnVJdGVtIHZhbHVlPVwiXCI+VOG6pXQgY+G6oyBrw6puaDwvTWVudUl0ZW0+e21ldGFkYXRhLmRhdGE/LmRhdGEuY2hhbm5lbHMubWFwKGNoYW5uZWwgPT4gPE1lbnVJdGVtIGtleT17Y2hhbm5lbC5pZH0gdmFsdWU9e2NoYW5uZWwuaWR9PntjaGFubmVsLmRpc3BsYXlOYW1lfTwvTWVudUl0ZW0+KX1cbiAgICAgICAgICAgICAgICAgICAgPC9UZXh0RmllbGQ+XG4gICAgICAgICAgICAgICAgICAgIDxUZXh0RmllbGQgc2VsZWN0IHNpemU9XCJzbWFsbFwiIGxhYmVsPVwiTmjDom4gdmnDqm5cIiB2YWx1ZT17YXNzaWduZWRVc2VySWQgfHwgJyd9IG9uQ2hhbmdlPXtldmVudCA9PiB1cGRhdGVGaWx0ZXIoJ2Fzc2lnbmVkVXNlcklkJywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gc3g9e3sgZmxleDogMSwgbWluV2lkdGg6IDE2MCB9fT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxNZW51SXRlbSB2YWx1ZT1cIlwiPlThuqV0IGPhuqMgbmjDom4gdmnDqm48L01lbnVJdGVtPnttZXRhZGF0YS5kYXRhPy5kYXRhLmFzc2lnbmVlcy5tYXAoYXNzaWduZWUgPT4gPE1lbnVJdGVtIGtleT17YXNzaWduZWUudXNlcklkfSB2YWx1ZT17YXNzaWduZWUudXNlcklkfT57YXNzaWduZWUuZGlzcGxheU5hbWV9PC9NZW51SXRlbT4pfVxuICAgICAgICAgICAgICAgICAgICA8L1RleHRGaWVsZD5cbiAgICAgICAgICAgICAgICA8L0ZpZWxkR3JvdXA+fSAvPlxuICAgICAgICAgICAgICAgIDxRdWVyeVN0YXRlIHF1ZXJ5PXtsaXN0fT5cbiAgICAgICAgICAgICAgICAgICAgPExpc3QgZGlzYWJsZVBhZGRpbmc+XG4gICAgICAgICAgICAgICAgICAgICAgICB7bGlzdC5kYXRhPy5kYXRhLm1hcChjID0+IDxMaXN0SXRlbSBrZXk9e2MuaWR9IGRpc2FibGVQYWRkaW5nPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxMaXN0SXRlbUJ1dHRvbiBzZWxlY3RlZD17Yy5pZCA9PT0gY29udmVyc2F0aW9uSWR9IGNvbXBvbmVudD17Um91dGVyTGlua30gdG89e2RldGFpbEhyZWYoYy5pZCl9IHN4PXtbbGF5b3V0U3guaW5ib3gubGlzdEluc2V0LCBsYXlvdXRTeC5pbmJveC5saXN0Q29udGVudEdhcCwgeyBhbGlnbkl0ZW1zOiAnc3RhcnQnLCBib3JkZXJCb3R0b206IDEsIGJvcmRlckNvbG9yOiAnZGl2aWRlcicgfV19PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8QXZhdGFyIHN4PXt7IGJnY29sb3I6IGNvbG9ycy5yYWlzZWQsIGNvbG9yOiAndGV4dC5wcmltYXJ5Jywgd2lkdGg6IDM4LCBoZWlnaHQ6IDM4IH19PntjLmRpc3BsYXlOYW1lLnNsaWNlKDAsIDEpfTwvQXZhdGFyPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8Qm94IHN4PXt7IG1pbldpZHRoOiAwLCBmbGV4OiAxIH19PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFN0YWNrIGRpcmVjdGlvbj1cInJvd1wiIGp1c3RpZnlDb250ZW50PVwic3BhY2UtYmV0d2VlblwiIHN4PXtbbGF5b3V0U3guc3VyZmFjZS5jb21wYWN0Q29udGVudEdhcCwgeyBhbGlnbkl0ZW1zOiAnY2VudGVyJyB9XX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFR5cG9ncmFwaHkgZm9udFdlaWdodD17dmlzdWFsU3gudHlwb2dyYXBoeS5mb250V2VpZ2h0LnN0cm9uZ30gbm9XcmFwPntjLmRpc3BsYXlOYW1lfTwvVHlwb2dyYXBoeT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Yy51bnJlYWRDb3VudCA+IDAgJiYgPEJveCBkYXRhLXRlc3RpZD1cImluYm94LXVucmVhZC1jb3VudFwiIHN4PXtbbGF5b3V0U3guaW5ib3gudW5yZWFkQ291bnRJbnNldCwgeyBiZ2NvbG9yOiAncHJpbWFyeS5tYWluJywgY29sb3I6IGNvbG9ycy5vbkFjY2VudCwgYm9yZGVyUmFkaXVzOiB2aXN1YWxTeC5yYWRpdXMubGFyZ2UsIGZvbnRTaXplOiB0b2tlbnMuZm9udFNpemVzLm1ldGEgfV19PntjLnVucmVhZENvdW50fTwvQm94Pn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvU3RhY2s+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VHlwb2dyYXBoeSB2YXJpYW50PVwiYm9keTJcIiBub1dyYXAgY29sb3I9XCJ0ZXh0LnNlY29uZGFyeVwiIHN4PXtbbGF5b3V0U3guc3VyZmFjZS50aXRsZURlc2NyaXB0aW9uR2FwLCB7IGRpc3BsYXk6ICdibG9jaycgfV19PntjLmxhc3RNZXNzYWdlUHJldmlldyB8fCAnQ2jGsGEgY8OzIHRpbiBuaOG6r24nfTwvVHlwb2dyYXBoeT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxCb3ggc3g9e2xheW91dFN4LmluYm94Lmxpc3RTdGF0dXNCZWZvcmVHYXB9PjxTdGF0dXMgdmFsdWU9e2MubW9kZX0gLz48L0JveD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9MaXN0SXRlbUJ1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvTGlzdEl0ZW0+KX1cbiAgICAgICAgICAgICAgICAgICAgPC9MaXN0PlxuICAgICAgICAgICAgICAgICAgICB7IWxpc3QuZGF0YT8uZGF0YS5sZW5ndGggJiYgPEVtcHR5IHRleHQ9XCJDaMawYSBjw7MgaOG7mWkgdGhv4bqhaSBwaMO5IGjhu6NwLlwiIC8+fVxuICAgICAgICAgICAgICAgICAgICA8UGFnZXIgcGFnZT17bGlzdC5kYXRhPy5wYWdlfSBjdXJzb3JQYXJhbT17bGlzdEN1cnNvclBhcmFtfSAvPlxuICAgICAgICAgICAgICAgIDwvUXVlcnlTdGF0ZT5cbiAgICAgICAgICAgIDwvUGFuZWw+XG4gICAgICAgICAgICB7Y29udmVyc2F0aW9uSWQgPyA8Q29udmVyc2F0aW9uUGFuZWwga2V5PXtjb252ZXJzYXRpb25JZH0gY29udmVyc2F0aW9uSWQ9e2NvbnZlcnNhdGlvbklkfSAvPiA6IDxQYW5lbD48RW1wdHkgdGV4dD1cIkNo4buNbiBt4buZdCBjdeG7mWMgdHLDsiBjaHV54buHbiDEkeG7gyB4ZW0gbOG7i2NoIHPhu60sIHRp4bq/cCBxdeG6o24gdsOgIHThuqFvIMSRxqFuLlwiIC8+PC9QYW5lbD59XG4gICAgICAgIDwvU2VjdGlvbkdyaWQ+XG4gICAgPC8+O1xufVxuZnVuY3Rpb24gQ29udmVyc2F0aW9uUGFuZWwoeyBjb252ZXJzYXRpb25JZCB9OiB7XG4gICAgY29udmVyc2F0aW9uSWQ6IHN0cmluZztcbn0pIHtcbiAgICBjb25zdCB7IHNob3AgfSA9IHVzZVNjb3BlKCk7XG4gICAgY29uc3QgW3BhcmFtc10gPSB1c2VTZWFyY2hQYXJhbXMoKTtcbiAgICBjb25zdCBjID0gdXNlQXBpKCdnZXRDb252ZXJzYXRpb24nLCB7IHBhdGg6IHsgY29udmVyc2F0aW9uSWQgfSB9KTtcbiAgICBjb25zdCBtZXNzYWdlQ3Vyc29yID0gcGFyYW1zLmdldCgnY3Vyc29yJykgfHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IG1lc3NhZ2VzID0gdXNlQXBpKCdsaXN0TWVzc2FnZXMnLCB7IHBhdGg6IHsgY29udmVyc2F0aW9uSWQgfSwgcXVlcnk6IHsgY3Vyc29yOiBtZXNzYWdlQ3Vyc29yLCBsaW1pdDogMTAwIH0gfSk7XG4gICAgY29uc3QgdGFrZW92ZXIgPSB1c2VDb21tYW5kKCd0YWtlb3ZlckNvbnZlcnNhdGlvbicsIFsnZ2V0Q29udmVyc2F0aW9uJywgJ2xpc3RDb252ZXJzYXRpb25zJ10pO1xuICAgIGNvbnN0IHJlbGVhc2UgPSB1c2VDb21tYW5kKCdyZWxlYXNlQ29udmVyc2F0aW9uJywgWydnZXRDb252ZXJzYXRpb24nLCAnbGlzdENvbnZlcnNhdGlvbnMnXSk7XG4gICAgY29uc3QgcmVzb2x2ZSA9IHVzZUNvbW1hbmQoJ3Jlc29sdmVDb252ZXJzYXRpb24nLCBbJ2dldENvbnZlcnNhdGlvbicsICdsaXN0Q29udmVyc2F0aW9ucyddKTtcbiAgICBjb25zdCBmZWVkYmFjayA9IHVzZUNvbW1hbmQoJ2NyZWF0ZUZlZWRiYWNrJywgWydsaXN0RmVlZGJhY2snXSk7XG4gICAgY29uc3QgW2FjdGlvbiwgc2V0QWN0aW9uXSA9IHVzZVN0YXRlPCd0YWtlb3ZlcicgfCAncmVsZWFzZScgfCAncmVzb2x2ZScgfCBudWxsPihudWxsKTtcbiAgICBjb25zdCBbcmF0aW5nTWVzc2FnZSwgc2V0UmF0aW5nTWVzc2FnZV0gPSB1c2VTdGF0ZTxNZXNzYWdlIHwgbnVsbD4obnVsbCk7XG4gICAgY29uc3QgW2NvcnJlY3Rpb24sIHNldENvcnJlY3Rpb25dID0gdXNlU3RhdGUoJycpO1xuICAgIGNvbnN0IFtyYXRpbmcsIHNldFJhdGluZ10gPSB1c2VTdGF0ZTwncG9zaXRpdmUnIHwgJ25lZ2F0aXZlJz4oJ25lZ2F0aXZlJyk7XG4gICAgY29uc3QgZW5kID0gdXNlUmVmPEhUTUxEaXZFbGVtZW50PihudWxsKTtcblxuICAgIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgICAgIGlmICghbWVzc2FnZUN1cnNvcikgZW5kLmN1cnJlbnQ/LnNjcm9sbEludG9WaWV3KHsgYmxvY2s6ICduZWFyZXN0JywgYmVoYXZpb3I6ICdhdXRvJyB9KTtcbiAgICB9LCBbbWVzc2FnZXMuZGF0YSwgbWVzc2FnZUN1cnNvcl0pO1xuXG4gICAgY29uc3QgaW5ib3hIcmVmID0gKCkgPT4ge1xuICAgICAgICBjb25zdCBuZXh0ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhwYXJhbXMpO1xuICAgICAgICBjb25zdCBsaXN0Q3Vyc29yID0gbmV4dC5nZXQoJ2xpc3RDdXJzb3InKTtcbiAgICAgICAgbmV4dC5kZWxldGUoJ2xpc3RDdXJzb3InKTtcbiAgICAgICAgbmV4dC5kZWxldGUoJ2N1cnNvcicpO1xuICAgICAgICBpZiAobGlzdEN1cnNvcikgbmV4dC5zZXQoJ2N1cnNvcicsIGxpc3RDdXJzb3IpO1xuICAgICAgICBjb25zdCBxdWVyeSA9IG5leHQudG9TdHJpbmcoKTtcbiAgICAgICAgcmV0dXJuIGAvcy8ke3Nob3AuaWR9L2luYm94JHtxdWVyeSA/IGA/JHtxdWVyeX1gIDogJyd9YDtcbiAgICB9O1xuXG4gICAgY29uc3QgY29udmVyc2F0aW9uID0gYy5kYXRhPy5kYXRhO1xuICAgIHJldHVybiAoXG4gICAgICAgIDxRdWVyeVN0YXRlIHF1ZXJ5PXtjfSBwZW5kaW5nUHJvZmlsZT1cInNlY3Rpb25cIj5cbiAgICAgICAgICAgIHtjb252ZXJzYXRpb24gJiYgKFxuICAgICAgICAgICAgICAgIDxTZWN0aW9uR3JpZCBkYXRhLXRlc3RpZD1cImluYm94LWNvbnZlcnNhdGlvbi1sYXlvdXRcIiBjb2x1bW5zPXt7IHhzOiAnMWZyJywgeGw6ICdtaW5tYXgoMCwxZnIpIDI2MHB4JyB9fSBnZW9tZXRyeT17e21pbldpZHRoOiAwfX0+XG4gICAgICAgICAgICAgICAgICAgIDxCb3ggZGF0YS10ZXN0aWQ9XCJpbmJveC10aHJlYWRcIiBjb21wb25lbnQ9XCJzZWN0aW9uXCIgYXJpYS1sYWJlbD1cIk7hu5lpIGR1bmcgaOG7mWkgdGhv4bqhaVwiIHN4PXt7IG1pbldpZHRoOiAwLCBoZWlnaHQ6IHsgeGw6IDY1MCB9IH19PlxuICAgICAgICAgICAgICAgICAgICAgICAgPFBhbmVsIGdlb21ldHJ5PXt7IGRpc3BsYXk6ICdmbGV4JywgZmxleERpcmVjdGlvbjogJ2NvbHVtbicsIGhlaWdodDogJzEwMCUnIH19PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxBY3Rpb25Hcm91cCBkaXJlY3Rpb249XCJyb3dcIiBhbGlnbkl0ZW1zPVwiY2VudGVyXCIganVzdGlmeUNvbnRlbnQ9XCJzcGFjZS1iZXR3ZWVuXCIgYm9keU1vZGU9XCJoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFN0YWNrIGRpcmVjdGlvbj1cInJvd1wiIGFsaWduSXRlbXM9XCJjZW50ZXJcIiBzeD17W2xheW91dFN4LnN1cmZhY2UuY29tcGFjdENvbnRlbnRHYXAsIHsgZmxleFdyYXA6ICd3cmFwJyB9XX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8QnV0dG9uIGNvbXBvbmVudD17Um91dGVyTGlua30gdG89e2luYm94SHJlZigpfSBzeD17eyBkaXNwbGF5OiB7IGxnOiAnbm9uZScgfSwgbWluV2lkdGg6IDQ0IH19IGFyaWEtbGFiZWw9XCJEYW5oIHPDoWNoIGjhu5lpIHRob+G6oWlcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8QXJyb3dCYWNrUm91bmRlZCAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8QXZhdGFyIHN4PXt7IGJnY29sb3I6IGNvbG9ycy5zZWxlY3RlZCwgY29sb3I6ICdwcmltYXJ5Lm1haW4nIH19Pntjb252ZXJzYXRpb24uZGlzcGxheU5hbWUuc2xpY2UoMCwgMSl9PC9BdmF0YXI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8Qm94PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUeXBvZ3JhcGh5IGNvbXBvbmVudD1cImgyXCIgdmFyaWFudD1cImg2XCI+e2NvbnZlcnNhdGlvbi5kaXNwbGF5TmFtZX08L1R5cG9ncmFwaHk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFR5cG9ncmFwaHkgdmFyaWFudD1cImNhcHRpb25cIiBjb2xvcj1cInRleHQuc2Vjb25kYXJ5XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtjb252ZXJzYXRpb24ubW9kZSA9PT0gJ2h1bWFuJyA/ICdOaMOibiB2acOqbiDEkWFuZyB0aeG6v3AgcXXhuqNuJyA6ICdUcuG7oyBsw70gdOG7sSDEkeG7mW5nJ30gwrcge2NvbnZlcnNhdGlvbi5pZH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L1R5cG9ncmFwaHk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9TdGFjaz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPEFjdGlvbkdyb3VwIGRpcmVjdGlvbj1cInJvd1wiID5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxNdXRhdGlvbkJ1dHRvbiBwZXJtaXNzaW9uPVwiY29udmVyc2F0aW9ucy5hc3NpZ25cIiB2YXJpYW50PVwib3V0bGluZWRcIiBvbkNsaWNrPXsoKSA9PiBzZXRBY3Rpb24oY29udmVyc2F0aW9uLm1vZGUgPT09ICdodW1hbicgPyAncmVsZWFzZScgOiAndGFrZW92ZXInKX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2NvbnZlcnNhdGlvbi5tb2RlID09PSAnaHVtYW4nID8gJ1Ry4bqjIGzhuqFpIGJvdCcgOiAnVGnhur9wIHF14bqjbid9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L011dGF0aW9uQnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPE11dGF0aW9uQnV0dG9uIHBlcm1pc3Npb249XCJjb252ZXJzYXRpb25zLmFzc2lnblwiIGRpc2FibGVkPXtjb252ZXJzYXRpb24uc3RhdHVzID09PSAncmVzb2x2ZWQnfSBvbkNsaWNrPXsoKSA9PiBzZXRBY3Rpb24oJ3Jlc29sdmUnKX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2nhuqNpIHF1eeG6v3RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvTXV0YXRpb25CdXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvQWN0aW9uR3JvdXA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9BY3Rpb25Hcm91cD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Y29udmVyc2F0aW9uLnNlbmRFbGlnaWJpbGl0eS5zdGF0ZSAhPT0gJ2FsbG93ZWQnICYmIChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPEJveCBzeD17bGF5b3V0U3guaW5ib3gucGFuZUluc2V0fT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxBbGVydCBzZXZlcml0eT1cIndhcm5pbmdcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBLaMO0bmcgxJHGsOG7o2MgZ+G7rWkgdGluOiB7Y29udmVyc2F0aW9uLnNlbmRFbGlnaWJpbGl0eS5yZWFzb25Db2RlIHx8ICdDaMawYSB4w6FjIG1pbmggcXV54buBbiBn4butaSd9LiBLaMO0bmcgdOG7sSB2xrDhu6N0IGPhu61hIHPhu5UvY2jDrW5oIHPDoWNoIGvDqm5oLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9BbGVydD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8Qm94IGRhdGEtdGVzdGlkPVwiaW5ib3gtbWVzc2FnZS1saXN0XCIgc3g9e1tsYXlvdXRTeC5pbmJveC5wYW5lSW5zZXQsIHsgZmxleDogMSwgbWluSGVpZ2h0OiAzNTAsIG1heEhlaWdodDogNTUwLCBvdmVyZmxvd1k6ICdhdXRvJywgYmFja2dyb3VuZDogY29sb3JzLmNhbnZhcyB9XX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxRdWVyeVN0YXRlIHF1ZXJ5PXttZXNzYWdlc30+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8U3RhY2sgZGF0YS10ZXN0aWQ9XCJpbmJveC1tZXNzYWdlLWdyb3Vwc1wiIHN4PXtsYXlvdXRTeC5pbmJveC5tZXNzYWdlR3JvdXBHYXB9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxDb252ZXJzYXRpb25NZXNzYWdlTGlzdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlcz17bWVzc2FnZXMuZGF0YT8uZGF0YSB8fCBbXX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXpvbmU9e3Nob3AudGltZXpvbmV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uUmF0ZT17bWVzc2FnZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRSYXRpbmdNZXNzYWdlKG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0Q29ycmVjdGlvbignJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IHJlZj17ZW5kfSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9TdGFjaz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHshbWVzc2FnZXMuZGF0YT8uZGF0YS5sZW5ndGggJiYgPEVtcHR5IHRleHQ9XCJDaMawYSBjw7MgdGluIG5o4bqvbi5cIiAvPn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxQYWdlciBwYWdlPXttZXNzYWdlcy5kYXRhPy5wYWdlfSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L1F1ZXJ5U3RhdGU+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPENvbnZlcnNhdGlvbkNvbXBvc2VyIGNvbnZlcnNhdGlvbj17Y29udmVyc2F0aW9ufSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9QYW5lbD5cbiAgICAgICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgICAgICAgIDxDb252ZXJzYXRpb25Db250ZXh0UGFuZWwgY29udmVyc2F0aW9uPXtjb252ZXJzYXRpb259PlxuICAgICAgICAgICAgICAgICAgICAgICAge19fTU9DS19fICYmIDxNb2NrU2FsZXNGbG93UHJldmlldyBjdXN0b21lcklkPXtjb252ZXJzYXRpb24uY3VzdG9tZXJJZH0gY29udmVyc2F0aW9uSWQ9e2NvbnZlcnNhdGlvbi5pZH0gLz59XG4gICAgICAgICAgICAgICAgICAgICAgICB7X19NT0NLX18gJiYgPE1vY2tNZWRpYVByZXZpZXcgLz59XG4gICAgICAgICAgICAgICAgICAgICAgICB7X19NT0NLX18gJiYgPE1vY2tVcHNlbGxQcmV2aWV3IC8+fVxuICAgICAgICAgICAgICAgICAgICA8L0NvbnZlcnNhdGlvbkNvbnRleHRQYW5lbD5cbiAgICAgICAgICAgICAgICAgICAgPENvbmZpcm1EaWFsb2dcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZW49eyEhYWN0aW9ufVxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU9e2FjdGlvbiA9PT0gJ3Rha2VvdmVyJyA/ICdUaeG6v3AgcXXhuqNuIGN14buZYyB0csOyIGNodXnhu4duJyA6IGFjdGlvbiA9PT0gJ3JlbGVhc2UnID8gJ1Ry4bqjIGN14buZYyB0csOyIGNodXnhu4duIHbhu4EgYm90JyA6ICfEkMOhbmggZOG6pXUgxJHDoyBnaeG6o2kgcXV54bq/dCd9XG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbj17YWN0aW9uID09PSAndGFrZW92ZXInID8gJ0PDoWMgY8OidSB0cuG6oyBs4budaSBBSSDEkWFuZyBjaOG7nSBwaOG6o2kgYuG7iyBjaOG6t24gdHLGsOG7m2Mga2hpIGfhu61pLicgOiAnSOG7hyB0aOG7kW5nIGtp4buDbSBs4bqhaSBxdXnhu4FuIHbDoCBwaGnDqm4gYuG6o24gaOG7mWkgdGhv4bqhaS4nfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWlyZVJlYXNvblxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbG9zZT17KCkgPT4gc2V0QWN0aW9uKG51bGwpfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnVzeT17dGFrZW92ZXIucGVuZGluZyB8fCByZWxlYXNlLnBlbmRpbmcgfHwgcmVzb2x2ZS5wZW5kaW5nfVxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I9e3Rha2VvdmVyLmVycm9yIHx8IHJlbGVhc2UuZXJyb3IgfHwgcmVzb2x2ZS5lcnJvcn1cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ29uZmlybT17cmVhc29uID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvcGVyYXRpb24gPSBhY3Rpb24gPT09ICd0YWtlb3ZlcicgPyB0YWtlb3ZlciA6IGFjdGlvbiA9PT0gJ3JlbGVhc2UnID8gcmVsZWFzZSA6IHJlc29sdmU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG9wZXJhdGlvbi5leGVjdXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogeyBjb252ZXJzYXRpb25JZCB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBjb252ZXJzYXRpb24udmVyc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYm9keTogeyBleHBlY3RlZFZlcnNpb246IGNvbnZlcnNhdGlvbi52ZXJzaW9uLCByZWFzb24gfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgIDxFZGl0RGlhbG9nXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuPXshIXJhdGluZ01lc3NhZ2V9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIsSQw6FuaCBnacOhIGPDonUgdHLhuqMgbOG7nWlcIlxuICAgICAgICAgICAgICAgICAgICAgICAgb25DbG9zZT17KCkgPT4gc2V0UmF0aW5nTWVzc2FnZShudWxsKX1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1c3k9e2ZlZWRiYWNrLnBlbmRpbmd9XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb25zPXsoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPEJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXJpYW50PVwiY29udGFpbmVkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2ZlZWRiYWNrLnBlbmRpbmd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9e2FzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcmF0aW5nTWVzc2FnZSkgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBmZWVkYmFjay5leGVjdXRlKHsgYm9keTogeyBjb252ZXJzYXRpb25JZCwgbWVzc2FnZUlkOiByYXRpbmdNZXNzYWdlLmlkLCByYXRpbmcsIGNvcnJlY3Rpb24gfSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRSYXRpbmdNZXNzYWdlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIHZpc2libGUgZXJyb3IgcmVtYWlucyBhdmFpbGFibGUgZm9yIHJldHJ5LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTMawdSBwaOG6o24gaOG7k2lcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxFcnJvck5vdGljZSBlcnJvcj17ZmVlZGJhY2suZXJyb3J9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8Rm9ybUZpZWxkcyA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPFR5cG9ncmFwaHkgc3g9e3sgd2hpdGVTcGFjZTogJ3ByZS13cmFwJyB9fT57cmF0aW5nTWVzc2FnZT8udGV4dH08L1R5cG9ncmFwaHk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRleHRGaWVsZCBsYWJlbD1cIsSQw6FuaCBnacOhXCIgc2VsZWN0IHZhbHVlPXtyYXRpbmd9IG9uQ2hhbmdlPXtldmVudCA9PiBzZXRSYXRpbmcoZXZlbnQudGFyZ2V0LnZhbHVlIGFzIHR5cGVvZiByYXRpbmcpfSBhdXRvRm9jdXM+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxNZW51SXRlbSB2YWx1ZT1cInBvc2l0aXZlXCI+SOG7r3Ugw61jaDwvTWVudUl0ZW0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxNZW51SXRlbSB2YWx1ZT1cIm5lZ2F0aXZlXCI+Q+G6p24gc+G7rWE8L01lbnVJdGVtPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvVGV4dEZpZWxkPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxUZXh0RmllbGQgbGFiZWw9XCJO4buZaSBkdW5nIMSR4buBIHh14bqldCBz4butYVwiIG11bHRpbGluZSBtaW5Sb3dzPXs0fSB2YWx1ZT17Y29ycmVjdGlvbn0gb25DaGFuZ2U9e2V2ZW50ID0+IHNldENvcnJlY3Rpb24oZXZlbnQudGFyZ2V0LnZhbHVlKX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8QWxlcnQgc2V2ZXJpdHk9XCJpbmZvXCI+UGjhuqNuIGjhu5NpIGtow7RuZyB04buxIHRy4bufIHRow6BuaCBraeG6v24gdGjhu6ljIMSRw6MgeHXhuqV0IGLhuqNuLiBD4bqnbiBuZ8aw4budaSBkdXnhu4d0IHbDoCBraeG7g20gdGjhu60uPC9BbGVydD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvRm9ybUZpZWxkcz5cbiAgICAgICAgICAgICAgICAgICAgPC9FZGl0RGlhbG9nPlxuICAgICAgICAgICAgICAgIDwvU2VjdGlvbkdyaWQ+XG4gICAgICAgICAgICApfVxuICAgICAgICA8L1F1ZXJ5U3RhdGU+XG4gICAgKTtcbn1cclxuZnVuY3Rpb24gTW9ja01lZGlhUHJldmlldygpIHtcbiAgICBjb25zdCBbb3Blbiwgc2V0T3Blbl0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gICAgcmV0dXJuIDxTdXJmYWNlQ29udGVudCBiZWZvcmVHYXA9XCJzdXJmYWNlXCI+XG4gICAgICAgIDxBbGVydCBzZXZlcml0eT1cImluZm9cIiBhY3Rpb249ezxCdXR0b24gc2l6ZT1cInNtYWxsXCIgb25DbGljaz17KCkgPT4gc2V0T3Blbih2YWx1ZSA9PiAhdmFsdWUpfT57b3BlbiA/ICfhuqhuIG3huqt1IG1lZGlhJyA6ICdYZW0gbeG6q3Ug4bqjbmggdsOgIHRpbiB0aG/huqFpJ308L0J1dHRvbj59PlxuICAgICAgICAgICAgUHJldmlldyBjaOG7iSBkw7luZyBk4buvIGxp4buHdSB04buVbmcgaOG7o3AuIE1lc3NhZ2UgY29udHJhY3QgY2jGsGEgY8OzIG1lZGlhOyBu4buZaSBkdW5nIG3huqt1IGtow7RuZyDEkcaw4bujYyBn4butaSwgcGjDoXQgaG/hurdjIGfhuq9uIHbDoG8gaOG7mWkgdGhv4bqhaS5cbiAgICAgICAgPC9BbGVydD5cbiAgICAgICAge29wZW4gJiYgPFN0YWNrIHJvbGU9XCJzdGF0dXNcIiBkYXRhLXRlc3RpZD1cIm1vY2stbWVkaWEtcHJldmlld1wiIHN4PXtbbGF5b3V0U3guc3VyZmFjZS5jb21wYWN0Q29udGVudEdhcCwgbGF5b3V0U3guc3VyZmFjZS5jb21wYWN0SW5zZXQsIHsgYm9yZGVyOiAxLCBib3JkZXJDb2xvcjogJ2RpdmlkZXInLCBib3JkZXJSYWRpdXM6IHZpc3VhbFN4LnJhZGl1cy5jb250cm9sIH1dfT5cbiAgICAgICAgICAgIDxCb3ggcm9sZT1cImltZ1wiIGFyaWEtbGFiZWw9XCLhuqJuaCBz4bqjbiBwaOG6qW0gbeG6q3UsIGtow7RuZyBwaOG6o2kgdOG7h3Aga2jDoWNoIGfhu61pXCIgc3g9e3sgbWluSGVpZ2h0OiA4MCwgZGlzcGxheTogJ2dyaWQnLCBwbGFjZUl0ZW1zOiAnY2VudGVyJywgYm9yZGVyUmFkaXVzOiB2aXN1YWxTeC5yYWRpdXMuY29udHJvbCwgYmdjb2xvcjogJ2FjdGlvbi5ob3ZlcicgfX0+XG4gICAgICAgICAgICAgICAgPFR5cG9ncmFwaHkgdmFyaWFudD1cImJvZHkyXCI+4bqibmggc+G6o24gcGjhuqltIG3huqt1IMK3IERFTU8tTUVESUEtSU1BR0UtMDE8L1R5cG9ncmFwaHk+XG4gICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgIDxUeXBvZ3JhcGh5IHZhcmlhbnQ9XCJib2R5MlwiIGZvbnRXZWlnaHQ9e3Zpc3VhbFN4LnR5cG9ncmFwaHkuZm9udFdlaWdodC5zdHJvbmd9PlRpbiB0aG/huqFpIG3huqt1IMK3IDAwOjA4IMK3IGNoxrBhIHBow6F0IMOibSB0aGFuaDwvVHlwb2dyYXBoeT5cbiAgICAgICAgICAgIDxUeXBvZ3JhcGh5IHZhcmlhbnQ9XCJjYXB0aW9uXCIgY29sb3I9XCJ0ZXh0LnNlY29uZGFyeVwiPkLhuqNuIGNow6lwIHRo4butOiDigJxTaG9wIGPDsm4gbcOgdSB4YW5oIGtow7RuZyDhuqE/4oCdIMK3IGNoxrBhIMSRxrDhu6NjIG5nxrDhu51pIGTDuW5nIHjDoWMgbmjhuq1uLjwvVHlwb2dyYXBoeT5cbiAgICAgICAgPC9TdGFjaz59XG4gICAgPC9TdXJmYWNlQ29udGVudD47XG59XG5cbnR5cGUgU2FsZXNQcmV2aWV3VGFiID0gJ3NjcmlwdCcgfCAnc291cmNlcycgfCAnb3JkZXInIHwgJ2NvbmZpcm1hdGlvbic7XG50eXBlIFNhbGVzU291cmNlUm93ID0ge1xuICAgIGtleTogc3RyaW5nO1xuICAgIHByb2R1Y3Q6IFByb2R1Y3Q7XG4gICAgdmFyaWFudDogUHJvZHVjdFsndmFyaWFudHMnXVtudW1iZXJdO1xuICAgIHNuYXBzaG90OiBTdG9ja1NuYXBzaG90O1xufTtcbmNvbnN0IHNhbXBsZVNhbGVzU2NyaXB0cyA9IHtcbiAgICBmYXNoaW9uOiB7XG4gICAgICAgIGxhYmVsOiAnVGjhu51pIHRyYW5nJyxcbiAgICAgICAgcXVlc3Rpb25zOiBbJ0LhuqFuIMSRYW5nIHTDrG0ga2nhu4N1IGTDoW5nIHbDoCBk4buLcCBz4butIGThu6VuZyBuw6BvPycsICdC4bqhbiBtdeG7kW4geGVtIG3DoHUgdsOgIGvDrWNoIGPhu6EgbsOgbz8nLCAnQ2hvIG3DrG5oIHhpbiBraHUgduG7sWMgZ2lhbyBow6BuZyDEkeG7gyBraeG7g20gdHJhIHBow60uJ10sXG4gICAgICAgIGJvdW5kYXJ5OiAnQ2jhu4kgdMawIHbhuqVuIGNo4bqldCBsaeG7h3UsIGvDrWNoIGPhu6EgdsOgIGNow61uaCBzw6FjaCDEkcOjIGPDsyBuZ3Xhu5NuOyB0aGnhur91IHRow7RuZyB0aW4gdGjDrCBo4buPaSBs4bqhaSBob+G6t2MgY2h1eeG7g24gbmjDom4gdmnDqm4uJyxcbiAgICB9LFxuICAgIGJlYXV0eToge1xuICAgICAgICBsYWJlbDogJ03hu7kgcGjhuqltJyxcbiAgICAgICAgcXVlc3Rpb25zOiBbJ0LhuqFuIMSRYW5nIHTDrG0gc+G6o24gcGjhuqltIGNobyBuaHUgY+G6p3UgbsOgbz8nLCAnQuG6oW4gY8OzIGThu4sg4bupbmcgaG/hurdjIHRow6BuaCBwaOG6p24gY+G6p24gdHLDoW5oIGtow7RuZz8nLCAnQuG6oW4gbXXhu5FuIG5ow6JuIHZpw6puIHTGsCB24bqlbiB0aMOqbSB0csaw4bubYyBraGkgY2jhu41uPyddLFxuICAgICAgICBib3VuZGFyeTogJ0tow7RuZyBjaOG6qW4gxJFvw6FuLCBo4bupYSBoaeG7h3UgcXXhuqMgxJFp4buBdSB0cuG7iyBob+G6t2Mga2jhurNuZyDEkeG7i25oIHBow7kgaOG7o3Aga2hpIGNoxrBhIGPDsyB0aMO0bmcgdGluIG5ndeG7k24uJyxcbiAgICB9LFxuICAgIGhvbWU6IHtcbiAgICAgICAgbGFiZWw6ICdHaWEgZOG7pW5nJyxcbiAgICAgICAgcXVlc3Rpb25zOiBbJ0LhuqFuIGPhuqduIGTDuW5nIHPhuqNuIHBo4bqpbSB0cm9uZyBraMO0bmcgZ2lhbiBuw6BvPycsICdLw61jaCB0aMaw4bubYyBob+G6t2MgY8O0bmcgc3XhuqV0IG1vbmcgbXXhu5FuIGzDoCBiYW8gbmhpw6p1PycsICdC4bqhbiBj4bqnbiBraeG7g20gdHJhIGLhuqNvIGjDoG5oIGhheSBjw6FjaCBs4bqvcCDEkeG6t3Q/J10sXG4gICAgICAgIGJvdW5kYXJ5OiAnVGhp4bq/dSBrw61jaCB0aMaw4bubYywgYuG6o28gaMOgbmggaG/hurdjIGjGsOG7m25nIGThuqtuIGPDsyBuZ3Xhu5NuIHRow6wga2jDtG5nIHThu7Egc3V5IGRp4buFbjsgY2h1eeG7g24gbmjDom4gdmnDqm4geMOhYyBtaW5oLicsXG4gICAgfSxcbn0gYXMgY29uc3Q7XG5cbmZ1bmN0aW9uIE1vY2tTYWxlc0Zsb3dQcmV2aWV3KHsgY3VzdG9tZXJJZCwgY29udmVyc2F0aW9uSWQgfTogeyBjdXN0b21lcklkOiBzdHJpbmc7IGNvbnZlcnNhdGlvbklkOiBzdHJpbmcgfSkge1xuICAgIGNvbnN0IHsgc2hvcCB9ID0gdXNlU2NvcGUoKTtcbiAgICBjb25zdCBjYW5SZWFkQ2F0YWxvZyA9IHVzZUNhbignY2F0YWxvZy5yZWFkJyk7XG4gICAgY29uc3QgY2FuUmVhZEludmVudG9yeSA9IHVzZUNhbignaW52ZW50b3J5LnJlYWQnKTtcbiAgICBjb25zdCBwcm9kdWN0cyA9IHVzZUFwaSgnbGlzdFByb2R1Y3RzJywgeyBxdWVyeTogeyBsaW1pdDogMTAwIH0gfSwgY2FuUmVhZENhdGFsb2cpO1xuICAgIGNvbnN0IHN0b2NrID0gdXNlQXBpKCdsaXN0U3RvY2tTbmFwc2hvdHMnLCB7IHF1ZXJ5OiB7IGxpbWl0OiAxMDAgfSB9LCBjYW5SZWFkSW52ZW50b3J5KTtcbiAgICBjb25zdCBbdGFiLCBzZXRUYWJdID0gdXNlU3RhdGU8U2FsZXNQcmV2aWV3VGFiPignc2NyaXB0Jyk7XG4gICAgY29uc3QgW2luZHVzdHJ5LCBzZXRJbmR1c3RyeV0gPSB1c2VTdGF0ZTxrZXlvZiB0eXBlb2Ygc2FtcGxlU2FsZXNTY3JpcHRzPignZmFzaGlvbicpO1xuICAgIGNvbnN0IHNjcmlwdCA9IHNhbXBsZVNhbGVzU2NyaXB0c1tpbmR1c3RyeV07XG4gICAgY29uc3Qgc291cmNlUm93cyA9IChwcm9kdWN0cy5kYXRhPy5kYXRhIHx8IFtdKS5maWx0ZXIocHJvZHVjdCA9PiBwcm9kdWN0LnN0YXR1cyA9PT0gJ2FjdGl2ZScpXG4gICAgICAgIC5mbGF0TWFwPFNhbGVzU291cmNlUm93Pihwcm9kdWN0ID0+IHByb2R1Y3QudmFyaWFudHMuZmlsdGVyKHZhcmlhbnQgPT4gdmFyaWFudC5hY3RpdmUgJiYgdmFyaWFudC5wcmljZSlcbiAgICAgICAgICAgIC5mbGF0TWFwKHZhcmlhbnQgPT4gKHN0b2NrLmRhdGE/LmRhdGEgfHwgW10pLmZpbHRlcihzbmFwc2hvdCA9PiBzbmFwc2hvdC52YXJpYW50SWQgPT09IHZhcmlhbnQuaWQpXG4gICAgICAgICAgICAgICAgLm1hcChzbmFwc2hvdCA9PiAoeyBrZXk6IGAke3ZhcmlhbnQuaWR9OiR7c25hcHNob3Qud2FyZWhvdXNlSWR9YCwgcHJvZHVjdCwgdmFyaWFudCwgc25hcHNob3QgfSkpKSk7XG5cbiAgICByZXR1cm4gPFBhbmVsIHRpdGxlPVwiTHXhu5NuZyB0xrAgduG6pW4gYsOhbiBow6BuZyDCtyBi4bqjbiB4ZW0gdHLGsOG7m2NcIiBzdWJ0aXRsZT1cIk3huqt1IHTGsMahbmcgdMOhYyBj4bulYyBi4buZOyBraMO0bmcgZ+G7jWkgQUkgdsOgIGtow7RuZyBn4butaSB0aW4gY2hvIGtow6FjaC5cIiBiZWZvcmVHYXA9XCJzdXJmYWNlXCIgYm9keU1vZGU9XCJpbnNldFwiPlxuICAgICAgICA8U3VyZmFjZUNvbnRlbnQgPlxuICAgICAgICAgICAgPEFsZXJ0IHNldmVyaXR5PVwiaW5mb1wiPk7hu5lpIGR1bmcgZMaw4bubaSDEkcOieSBjaOG7iSBtaW5oIGjhu41hIGdpYW8gZGnhu4duLiBC4bqjbiBkZW1vIGtow7RuZyB04buxIHThuqFvIGPDonUgdHLhuqMgbOG7nWkgQUkgaG/hurdjIGzGsHUga+G7i2NoIGLhuqNuIGzDqm4gbcOheSBjaOG7py48L0FsZXJ0PlxuICAgICAgICAgICAgPFRhYnMgdmFsdWU9e3RhYn0gb25DaGFuZ2U9eyhfLCB2YWx1ZTogU2FsZXNQcmV2aWV3VGFiKSA9PiBzZXRUYWIodmFsdWUpfSB2YXJpYW50PVwic2Nyb2xsYWJsZVwiIHNjcm9sbEJ1dHRvbnM9XCJhdXRvXCIgYXJpYS1sYWJlbD1cIkPDoWMgYsaw4bubYyB0xrAgduG6pW4gYsOhbiBow6BuZyBt4bqrdVwiPlxuICAgICAgICAgICAgICAgIDxUYWIgdmFsdWU9XCJzY3JpcHRcIiBsYWJlbD1cIkvhu4tjaCBi4bqjblwiIC8+XG4gICAgICAgICAgICAgICAgPFRhYiB2YWx1ZT1cInNvdXJjZXNcIiBsYWJlbD1cIkdpw6EgJiB04buTblwiIC8+XG4gICAgICAgICAgICAgICAgPFRhYiB2YWx1ZT1cIm9yZGVyXCIgbGFiZWw9XCJU4bqhbyDEkcahblwiIC8+XG4gICAgICAgICAgICAgICAgPFRhYiB2YWx1ZT1cImNvbmZpcm1hdGlvblwiIGxhYmVsPVwiWMOhYyBuaOG6rW5cIiAvPlxuICAgICAgICAgICAgPC9UYWJzPlxuICAgICAgICAgICAge3RhYiA9PT0gJ3NjcmlwdCcgJiYgPFN1cmZhY2VDb250ZW50ICByb2xlPVwidGFicGFuZWxcIiBhcmlhLWxhYmVsPVwiS+G7i2NoIGLhuqNuIHTGsCB24bqlbiBt4bqrdVwiPlxuICAgICAgICAgICAgICAgIDxUZXh0RmllbGQgc2VsZWN0IGxhYmVsPVwiTmfDoG5oIGjDoG5nIG3huqt1XCIgdmFsdWU9e2luZHVzdHJ5fSBvbkNoYW5nZT17ZXZlbnQgPT4gc2V0SW5kdXN0cnkoZXZlbnQudGFyZ2V0LnZhbHVlIGFzIGtleW9mIHR5cGVvZiBzYW1wbGVTYWxlc1NjcmlwdHMpfT5cbiAgICAgICAgICAgICAgICAgICAge09iamVjdC5lbnRyaWVzKHNhbXBsZVNhbGVzU2NyaXB0cykubWFwKChba2V5LCB2YWx1ZV0pID0+IDxNZW51SXRlbSBrZXk9e2tleX0gdmFsdWU9e2tleX0+e3ZhbHVlLmxhYmVsfTwvTWVudUl0ZW0+KX1cbiAgICAgICAgICAgICAgICA8L1RleHRGaWVsZD5cbiAgICAgICAgICAgICAgICA8VHlwb2dyYXBoeSBjb21wb25lbnQ9XCJoM1wiIHZhcmlhbnQ9XCJzdWJ0aXRsZTJcIj5Dw6J1IGjhu49pIGfhu6NpIMO9PC9UeXBvZ3JhcGh5PlxuICAgICAgICAgICAgICAgIHtzY3JpcHQucXVlc3Rpb25zLm1hcCgocXVlc3Rpb24sIGluZGV4KSA9PiA8VHlwb2dyYXBoeSBrZXk9e3F1ZXN0aW9ufSB2YXJpYW50PVwiYm9keTJcIj57aW5kZXggKyAxfS4ge3F1ZXN0aW9ufTwvVHlwb2dyYXBoeT4pfVxuICAgICAgICAgICAgICAgIDxBbGVydCBzZXZlcml0eT1cIndhcm5pbmdcIj5SYW5oIGdp4bubaSBt4bqrdToge3NjcmlwdC5ib3VuZGFyeX08L0FsZXJ0PlxuICAgICAgICAgICAgICAgIDxUeXBvZ3JhcGh5IHZhcmlhbnQ9XCJjYXB0aW9uXCIgY29sb3I9XCJ0ZXh0LnNlY29uZGFyeVwiPkLhuqNuIG5ow6FwIG3huqt1IHJpw6puZyB24bubaSBj4bqldSBow6xuaCBib3QgxJFhbmcgZMO5bmc7IGtow7RuZyBjw7MgdGhhbyB0w6FjIHh14bqldCBi4bqjbiDhu58gxJHDonkuPC9UeXBvZ3JhcGh5PlxuICAgICAgICAgICAgPC9TdXJmYWNlQ29udGVudD59XG4gICAgICAgICAgICB7dGFiID09PSAnc291cmNlcycgJiYgPFN1cmZhY2VDb250ZW50ICByb2xlPVwidGFicGFuZWxcIiBhcmlhLWxhYmVsPVwiTmd14buTbiBnacOhIHbDoCB04buTbiB0cm9uZyBo4buZcCB0aMawXCI+XG4gICAgICAgICAgICAgICAgPEFsZXJ0IHNldmVyaXR5PVwiaW5mb1wiPkdpw6EgbOG6pXkgdOG7qyBjYXRhbG9nIHbDoCB04buTbiB04burIHNuYXBzaG90IGPDsyB0aOG7nWkgxJFp4buDbS4gROG7ryBsaeG7h3UgY2jhu4kgbMOgIG1vY2s7IGPhuqduIHRydXkgduG6pW4gbOG6oWkgdHLGsOG7m2Mga2hpIHjDoWMgbmjhuq1uIMSRxqFuLjwvQWxlcnQ+XG4gICAgICAgICAgICAgICAgeyFjYW5SZWFkQ2F0YWxvZyB8fCAhY2FuUmVhZEludmVudG9yeVxuICAgICAgICAgICAgICAgICAgICA/IDxBbGVydCBzZXZlcml0eT1cIndhcm5pbmdcIj5D4bqnbiBxdXnhu4FuIHhlbSBz4bqjbiBwaOG6qW0gdsOgIHThu5NuIGtobyDEkeG7gyDEkeG7kWkgY2hp4bq/dSBuZ3Xhu5NuLjwvQWxlcnQ+XG4gICAgICAgICAgICAgICAgICAgIDogPFF1ZXJ5U3RhdGUgcXVlcnk9e3Byb2R1Y3RzfSBwZW5kaW5nUHJvZmlsZT1cInNlY3Rpb25cIj57cHJvZHVjdHMuZGF0YSAmJiA8UXVlcnlTdGF0ZSBxdWVyeT17c3RvY2t9IHBlbmRpbmdQcm9maWxlPVwic2VjdGlvblwiPntzdG9jay5kYXRhICYmIDw+XG4gICAgICAgICAgICAgICAgICAgIDxEYXRhVGFibGUgbGFiZWw9XCJOZ3Xhu5NuIGdpw6EgdsOgIHThu5NuIHRyb25nIGjhu5lwIHRoxrBcIiByb3dzPXtzb3VyY2VSb3dzfSByb3dLZXk9e3JvdyA9PiByb3cua2V5fSBlbXB0eT1cIkNoxrBhIGPDsyBz4bqjbiBwaOG6qW0gxJHhu6cgZOG7ryBsaeG7h3UgxJHhu4MgxJHhu5FpIGNoaeG6v3UuXCIgY29sdW1ucz17W1xuICAgICAgICAgICAgICAgICAgICAgICAgeyBrZXk6ICdwcm9kdWN0JywgbGFiZWw6ICdT4bqjbiBwaOG6qW0nLCByZW5kZXI6IHJvdyA9PiByb3cucHJvZHVjdC5uYW1lIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7IGtleTogJ3NrdScsIGxhYmVsOiAnU0tVJywgcmVuZGVyOiByb3cgPT4gcm93LnZhcmlhbnQuc2t1IH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7IGtleTogJ3ByaWNlJywgbGFiZWw6ICdHacOhJywgYWxpZ246ICdyaWdodCcsIHJlbmRlcjogcm93ID0+IDxBbW91bnQgdmFsdWU9e3Jvdy52YXJpYW50LnByaWNlfSAvPiB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgeyBrZXk6ICdhdmFpbGFibGUnLCBsYWJlbDogJ0PDsyB0aOG7gyBiw6FuJywgYWxpZ246ICdyaWdodCcsIHJlbmRlcjogcm93ID0+IHJvdy5zbmFwc2hvdC5hdmFpbGFibGUgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHsga2V5OiAnYXNPZicsIGxhYmVsOiAnU25hcHNob3QgbMO6YycsIHJlbmRlcjogcm93ID0+IGRhdGVUaW1lKHJvdy5zbmFwc2hvdC5hc09mLCBzaG9wLnRpbWV6b25lKSB9LFxuICAgICAgICAgICAgICAgICAgICBdfSAvPlxuICAgICAgICAgICAgICAgICAgICA8VHlwb2dyYXBoeSB2YXJpYW50PVwiY2FwdGlvblwiIGNvbG9yPVwidGV4dC5zZWNvbmRhcnlcIj5QcmV2aWV3IGdp4bubaSBo4bqhbiDhu58gMTAwIHPhuqNuIHBo4bqpbSB2w6AgMTAwIHNuYXBzaG90IMSR4bqndSB0acOqbjsga2jDtG5nIHBo4bqjaSBkYW5oIHPDoWNoIMSR4bqneSDEkeG7py48L1R5cG9ncmFwaHk+XG4gICAgICAgICAgICAgICAgICAgIDxBY3Rpb25Hcm91cCBkaXJlY3Rpb249XCJyb3dcIiBkZW5zaXR5PVwiY29tZm9ydGFibGVcIj48Um91dGVMaW5rIHRvPXtgL3MvJHtzaG9wLmlkfS9wcm9kdWN0c2B9Pk3hu58gZGFuaCBzw6FjaCBz4bqjbiBwaOG6qW08L1JvdXRlTGluaz48Um91dGVMaW5rIHRvPXtgL3MvJHtzaG9wLmlkfS9pbnZlbnRvcnlgfT5N4bufIGRhbmggc8OhY2ggdOG7k24ga2hvPC9Sb3V0ZUxpbms+PC9BY3Rpb25Hcm91cD5cbiAgICAgICAgICAgICAgICAgICAgPC8+fTwvUXVlcnlTdGF0ZT59PC9RdWVyeVN0YXRlPn1cbiAgICAgICAgICAgIDwvU3VyZmFjZUNvbnRlbnQ+fVxuICAgICAgICAgICAge3RhYiA9PT0gJ29yZGVyJyAmJiA8U3VyZmFjZUNvbnRlbnQgIHJvbGU9XCJ0YWJwYW5lbFwiIGFyaWEtbGFiZWw9XCJU4bqhbyDEkcahbiB04burIGjhu5lpIHRob+G6oWlcIj5cbiAgICAgICAgICAgICAgICA8VHlwb2dyYXBoeSB2YXJpYW50PVwiYm9keTJcIj5DaHV54buDbiBzYW5nIGJp4buDdSBt4bqrdSDEkcahbiDEkeG7gyBuaMOibiB2acOqbiBraeG7g20gdHJhIGtow6FjaCwgc+G6o24gcGjhuqltLCBz4buRIGzGsOG7o25nIHbDoCBiw6FvIGdpw6EuPC9UeXBvZ3JhcGh5PlxuICAgICAgICAgICAgICAgIDxSb3V0ZUxpbmsgdG89e2Avcy8ke3Nob3AuaWR9L29yZGVycy9uZXc/Y3VzdG9tZXJJZD0ke2N1c3RvbWVySWR9JmNvbnZlcnNhdGlvbklkPSR7Y29udmVyc2F0aW9uSWR9YH0+TeG7nyBiaeG7g3UgbeG6q3UgdOG6oW8gxJHGoW4gdOG7qyBo4buZaSB0aG/huqFpPC9Sb3V0ZUxpbms+XG4gICAgICAgICAgICAgICAgPEFsZXJ0IHNldmVyaXR5PVwiaW5mb1wiPsSQxqFuIHRyb25nIGRlbW8gxJHGsOG7o2MgbMawdSB2w6BvIE1TVyBj4bulYyBi4buZIGPhu6dhIHRhYjsgxJHDonkga2jDtG5nIHBo4bqjaSDEkcahbiB0csOqbiBtw6F5IGNo4bunLjwvQWxlcnQ+XG4gICAgICAgICAgICA8L1N1cmZhY2VDb250ZW50Pn1cbiAgICAgICAgICAgIHt0YWIgPT09ICdjb25maXJtYXRpb24nICYmIDxTdXJmYWNlQ29udGVudCAgcm9sZT1cInRhYnBhbmVsXCIgYXJpYS1sYWJlbD1cIsSQaeG7gXUga2nhu4duIHjDoWMgbmjhuq1uIMSRxqFuXCI+XG4gICAgICAgICAgICAgICAgPEFsZXJ0IHNldmVyaXR5PVwid2FybmluZ1wiPktow7RuZyB04buxIGNo4buRdCDEkcahbiB0cm9uZyBnaWFvIGRp4buHbiBuw6B5LiBC4bqxbmcgY2jhu6luZyB4w6FjIG5o4bqtbiBj4bunYSBraMOhY2gsIGLDoW8gZ2nDoSBoaeG7h24gaMOgbmggdsOgIMSRaeG7gXUga2nhu4duIGdpYW8gbmjhuq1uIHBo4bqjaSDEkcaw4bujYyBraeG7g20gdHJhIHRyxrDhu5tjIGtoaSBuaMOibiB2acOqbiB4w6FjIG5o4bqtbi48L0FsZXJ0PlxuICAgICAgICAgICAgICAgIDxCdXR0b24gdmFyaWFudD1cIm91dGxpbmVkXCIgZGlzYWJsZWQ+VOG7sSDEkeG7mW5nIHjDoWMgbmjhuq1uIMSRxqFuIGNoxrBhIMSRxrDhu6NjIGjhu5cgdHLhu6M8L0J1dHRvbj5cbiAgICAgICAgICAgICAgICA8VHlwb2dyYXBoeSB2YXJpYW50PVwiY2FwdGlvblwiIGNvbG9yPVwidGV4dC5zZWNvbmRhcnlcIj5D4bqnbiBi4buVIHN1bmcgY2FwYWJpbGl0eSB2w6AgcG9saWN5IHRyb25nIGNvbnRyYWN0IHRyxrDhu5tjIGtoaSBi4bqtdCB04buxIMSR4buZbmcgeMOhYyBuaOG6rW4uPC9UeXBvZ3JhcGh5PlxuICAgICAgICAgICAgPC9TdXJmYWNlQ29udGVudD59XG4gICAgICAgIDwvU3VyZmFjZUNvbnRlbnQ+XG4gICAgPC9QYW5lbD47XG59XG5cbmZ1bmN0aW9uIE1vY2tVcHNlbGxQcmV2aWV3KCkge1xuICAgIGNvbnN0IFtvcGVuLCBzZXRPcGVuXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgICByZXR1cm4gPFN1cmZhY2VDb250ZW50IGJlZm9yZUdhcD1cInN1cmZhY2VcIj5cbiAgICAgICAgPFR5cG9ncmFwaHkgY29tcG9uZW50PVwiaDNcIiB2YXJpYW50PVwic3VidGl0bGUyXCI+R+G7o2kgw70gYsOhbiBrw6htIG3huqt1IMK3IERFTU8tUFJPTU8tMDE8L1R5cG9ncmFwaHk+XG4gICAgICAgIDxBbGVydCBzZXZlcml0eT1cImluZm9cIj5Db21ibyDDoW8gdGh1biArIHTDumkgdG90ZSBjaOG7iSBtaW5oIGjhu41hIGdpYW8gZGnhu4duLiBLaMO0bmcgY8OzIEFQSSBraHV54bq/biBt4bqhaTsgZ2nDoSwgbOG7o2kgbmh14bqtbiwgU0tVIHbDoCB04buTbiBraG8gY2jGsGEgxJHGsOG7o2MgeMOhYyB0aOG7sWMuPC9BbGVydD5cbiAgICAgICAgPEJ1dHRvbiBzaXplPVwic21hbGxcIiB2YXJpYW50PVwib3V0bGluZWRcIiBvbkNsaWNrPXsoKSA9PiBzZXRPcGVuKHZhbHVlID0+ICF2YWx1ZSl9PntvcGVuID8gJ+G6qG4gxJFp4buBdSBraeG7h24gbeG6q3UnIDogJ1hlbSDEkWnhu4F1IGtp4buHbiBjb21ibyBt4bqrdSd9PC9CdXR0b24+XG4gICAgICAgIHtvcGVuICYmIDxTdGFjayByb2xlPVwic3RhdHVzXCIgZGF0YS10ZXN0aWQ9XCJtb2NrLXByb21vdGlvbi1wcmV2aWV3XCIgc3g9e1tsYXlvdXRTeC5zdXJmYWNlLmNvbXBhY3RDb250ZW50R2FwLCBsYXlvdXRTeC5zdXJmYWNlLmNvbXBhY3RJbnNldCwgeyBib3JkZXI6IDEsIGJvcmRlckNvbG9yOiAnZGl2aWRlcicsIGJvcmRlclJhZGl1czogdmlzdWFsU3gucmFkaXVzLmNvbnRyb2wgfV19PlxuICAgICAgICAgICAgPFR5cG9ncmFwaHkgY29tcG9uZW50PVwiaDNcIiB2YXJpYW50PVwic3VidGl0bGUyXCI+Q29tYm8gbeG6q3UgwrcgREVNTy1QUk9NTy0wMTwvVHlwb2dyYXBoeT5cbiAgICAgICAgICAgIDxUeXBvZ3JhcGh5IHZhcmlhbnQ9XCJib2R5MlwiPsSQaeG7gXUga2nhu4duIG1pbmggaOG7jWE6IGPDsyDDrXQgbmjhuqV0IG3hu5l0IMOhbyB2w6AgbeG7mXQgcGjhu6Uga2nhu4duIHRyb25nIMSRxqFuIG5ow6FwLjwvVHlwb2dyYXBoeT5cbiAgICAgICAgICAgIDxUeXBvZ3JhcGh5IHZhcmlhbnQ9XCJjYXB0aW9uXCIgY29sb3I9XCJ0ZXh0LnNlY29uZGFyeVwiPktow7RuZyDDoXAgZOG7pW5nIGdp4bqjbSBnacOhLCBraMO0bmcgc+G7rWEgxJHGoW4gdsOgIGtow7RuZyBraOG6s25nIMSR4buLbmggxJHhuqF0IGJpw6puIGzhu6NpIG5odeG6rW4uPC9UeXBvZ3JhcGh5PlxuICAgICAgICA8L1N0YWNrPn1cbiAgICA8L1N1cmZhY2VDb250ZW50Pjtcbn1cbiJdLCJmaWxlIjoiQzovVXNlcnMvSm9rZXItUEMvRG9jdW1lbnRzL1Byb2plY3RzL0JvdC1BSS1CYW4taGFuZy1GQi9Cb3RTYWxlc0FJX0Zyb250ZW5kL2FwcHMvd2ViL3NyYy9tb2R1bGVzL2luYm94L2luZGV4LnRzeCJ9