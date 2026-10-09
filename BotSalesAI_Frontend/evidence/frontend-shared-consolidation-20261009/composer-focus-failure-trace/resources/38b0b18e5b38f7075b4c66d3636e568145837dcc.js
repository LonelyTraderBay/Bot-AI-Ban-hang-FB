import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/modules/inbox/index.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-71740-905ecb82-e117-4987-abfc-1edc71e89605/deps/react_jsx-dev-runtime.js?v=6038fcaa"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
import __vite__cjsImport4_react from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-71740-905ecb82-e117-4987-abfc-1edc71e89605/deps/react.js?v=6038fcaa"; const useEffect = __vite__cjsImport4_react["useEffect"]; const useRef = __vite__cjsImport4_react["useRef"]; const useState = __vite__cjsImport4_react["useState"];
import { visualSx } from "/src/shared/ui/visual.ts";
import { Link as RouterLink, useParams, useSearchParams } from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-71740-905ecb82-e117-4987-abfc-1edc71e89605/deps/react-router-dom.js?v=33bf55da";
import { Alert, Avatar, Box, Button, List, ListItem, ListItemButton, MenuItem, Stack, Tab, Tabs, TextField, Typography } from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-71740-905ecb82-e117-4987-abfc-1edc71e89605/deps/@mui_material.js?v=58d20628";
import ArrowBackRounded from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-71740-905ecb82-e117-4987-abfc-1edc71e89605/deps/@mui_icons-material_ArrowBackRounded.js?v=aaf5b651";
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
      /* @__PURE__ */ jsxDEV(ActionGroup, { direction: "row", alignItems: "center", justifyContent: "space-between", bodyMode: "header", geometry: { flex: "0 0 auto" }, children: [
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
      /* @__PURE__ */ jsxDEV(Box, { "data-testid": "inbox-message-list", sx: [layoutSx.inbox.paneInset, { flex: 1, minHeight: { xs: 350, xl: 0 }, maxHeight: 550, overflowY: "auto", background: colors.canvas }], children: /* @__PURE__ */ jsxDEV(QueryState, { query: messages, children: [
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

//# sourceMappingURL=data:application/json;base64,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RUFBRUMsUUFBUSxHQUFHbkYsYUFBYSxXQUFXZSxjQUFjbEgsU0FBU21ILE9BQU9vRSxRQUFRLENBQUMsR0FDbk47QUFBQSw2QkFBQyxjQUFXLFdBQVUsTUFBSyxTQUFRLGFBQVkseUNBQS9DO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBd0U7QUFBQSxNQUN4RSx1QkFBQyxjQUFXLFNBQVEsU0FBUSxxRkFBNUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFpRztBQUFBLE1BQ2pHLHVCQUFDLGNBQVcsU0FBUSxXQUFVLE9BQU0sa0JBQWlCLDZGQUFyRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWtJO0FBQUEsU0FIN0g7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUlUO0FBQUEsT0FSRztBQUFBO0FBQUE7QUFBQTtBQUFBLFNBU1A7QUFDSjtBQUFDNEMsSUFaUUQsbUJBQWlCO0FBQUEsTUFBakJBO0FBQWlCLElBQUFFLElBQUFDLEtBQUFDLEtBQUFDLEtBQUFDO0FBQUEsYUFBQUosSUFBQTtBQUFBLGFBQUFDLEtBQUE7QUFBQSxhQUFBQyxLQUFBO0FBQUEsYUFBQUMsS0FBQTtBQUFBLGFBQUFDLEtBQUEiLCJuYW1lcyI6WyJBY3Rpb25Hcm91cCIsIkZpZWxkR3JvdXAiLCJGb3JtRmllbGRzIiwiU2VjdGlvbkdyaWQiLCJTdXJmYWNlQ29udGVudCIsInVzZUVmZmVjdCIsInVzZVJlZiIsInVzZVN0YXRlIiwidmlzdWFsU3giLCJMaW5rIiwiUm91dGVyTGluayIsInVzZVBhcmFtcyIsInVzZVNlYXJjaFBhcmFtcyIsIkFsZXJ0IiwiQXZhdGFyIiwiQm94IiwiQnV0dG9uIiwiTGlzdCIsIkxpc3RJdGVtIiwiTGlzdEl0ZW1CdXR0b24iLCJNZW51SXRlbSIsIlN0YWNrIiwiVGFiIiwiVGFicyIsIlRleHRGaWVsZCIsIlR5cG9ncmFwaHkiLCJBcnJvd0JhY2tSb3VuZGVkIiwiY29sb3JzIiwidG9rZW5zIiwidXNlQXBpIiwidXNlQ29tbWFuZCIsInVzZVNjb3BlIiwidXNlQ2FuIiwiZGF0ZVRpbWUiLCJQYWdlSGVhZGVyIiwiUGFuZWwiLCJRdWVyeVN0YXRlIiwiVG9vbGJhciIsIlBhZ2VyIiwiU3RhdHVzIiwiTXV0YXRpb25CdXR0b24iLCJFZGl0RGlhbG9nIiwiRXJyb3JOb3RpY2UiLCJDb25maXJtRGlhbG9nIiwiUm91dGVMaW5rIiwiRW1wdHkiLCJEYXRhVGFibGUiLCJBbW91bnQiLCJsYXlvdXRTeCIsIkNvbnZlcnNhdGlvbkNvbXBvc2VyIiwiQ29udmVyc2F0aW9uQ29udGV4dFBhbmVsIiwiQ29udmVyc2F0aW9uTWVzc2FnZUxpc3QiLCJJbmJveFBhZ2UiLCJfcyIsImNvbnZlcnNhdGlvbklkIiwic2hvcCIsInBhcmFtcyIsInNldFBhcmFtcyIsInEiLCJnZXQiLCJyYXdNb2RlIiwibW9kZSIsImZpbmQiLCJ2YWx1ZSIsInN0YXR1cyIsImNoYW5uZWxJZCIsInVuZGVmaW5lZCIsImFzc2lnbmVkVXNlcklkIiwibGlzdEN1cnNvclBhcmFtIiwiY3Vyc29yIiwibWV0YWRhdGEiLCJsaXN0IiwicXVlcnkiLCJsaW1pdCIsInVwZGF0ZUZpbHRlciIsImtleSIsIm5leHQiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZXQiLCJkZWxldGUiLCJkZXRhaWxIcmVmIiwiaWQiLCJsaXN0Q3Vyc29yIiwidG9TdHJpbmciLCJ4cyIsImxnIiwibWluSGVpZ2h0IiwiZGlzcGxheSIsInNtIiwiZXZlbnQiLCJ0YXJnZXQiLCJmbGV4IiwibWluV2lkdGgiLCJkYXRhIiwiY2hhbm5lbHMiLCJtYXAiLCJjaGFubmVsIiwiZGlzcGxheU5hbWUiLCJhc3NpZ25lZXMiLCJhc3NpZ25lZSIsInVzZXJJZCIsImMiLCJpbmJveCIsImxpc3RJbnNldCIsImxpc3RDb250ZW50R2FwIiwiYWxpZ25JdGVtcyIsImJvcmRlckJvdHRvbSIsImJvcmRlckNvbG9yIiwiYmdjb2xvciIsInJhaXNlZCIsImNvbG9yIiwid2lkdGgiLCJoZWlnaHQiLCJzbGljZSIsInN1cmZhY2UiLCJjb21wYWN0Q29udGVudEdhcCIsInR5cG9ncmFwaHkiLCJmb250V2VpZ2h0Iiwic3Ryb25nIiwidW5yZWFkQ291bnQiLCJ1bnJlYWRDb3VudEluc2V0Iiwib25BY2NlbnQiLCJib3JkZXJSYWRpdXMiLCJyYWRpdXMiLCJsYXJnZSIsImZvbnRTaXplIiwiZm9udFNpemVzIiwibWV0YSIsInRpdGxlRGVzY3JpcHRpb25HYXAiLCJsYXN0TWVzc2FnZVByZXZpZXciLCJsaXN0U3RhdHVzQmVmb3JlR2FwIiwibGVuZ3RoIiwicGFnZSIsIkNvbnZlcnNhdGlvblBhbmVsIiwiX3MyIiwicGF0aCIsIm1lc3NhZ2VDdXJzb3IiLCJtZXNzYWdlcyIsInRha2VvdmVyIiwicmVsZWFzZSIsInJlc29sdmUiLCJmZWVkYmFjayIsImFjdGlvbiIsInNldEFjdGlvbiIsInJhdGluZ01lc3NhZ2UiLCJzZXRSYXRpbmdNZXNzYWdlIiwiY29ycmVjdGlvbiIsInNldENvcnJlY3Rpb24iLCJyYXRpbmciLCJzZXRSYXRpbmciLCJlbmQiLCJjdXJyZW50Iiwic2Nyb2xsSW50b1ZpZXciLCJibG9jayIsImJlaGF2aW9yIiwiaW5ib3hIcmVmIiwiY29udmVyc2F0aW9uIiwieGwiLCJmbGV4RGlyZWN0aW9uIiwiZmxleFdyYXAiLCJzZWxlY3RlZCIsInNlbmRFbGlnaWJpbGl0eSIsInN0YXRlIiwicGFuZUluc2V0IiwicmVhc29uQ29kZSIsIm1heEhlaWdodCIsIm92ZXJmbG93WSIsImJhY2tncm91bmQiLCJjYW52YXMiLCJtZXNzYWdlR3JvdXBHYXAiLCJ0aW1lem9uZSIsIm1lc3NhZ2UiLCJfX01PQ0tfXyIsImN1c3RvbWVySWQiLCJwZW5kaW5nIiwiZXJyb3IiLCJyZWFzb24iLCJvcGVyYXRpb24iLCJleGVjdXRlIiwidmVyc2lvbiIsImJvZHkiLCJleHBlY3RlZFZlcnNpb24iLCJtZXNzYWdlSWQiLCJ3aGl0ZVNwYWNlIiwidGV4dCIsIk1vY2tNZWRpYVByZXZpZXciLCJfczMiLCJvcGVuIiwic2V0T3BlbiIsImNvbXBhY3RJbnNldCIsImJvcmRlciIsImNvbnRyb2wiLCJwbGFjZUl0ZW1zIiwic2FtcGxlU2FsZXNTY3JpcHRzIiwiZmFzaGlvbiIsImxhYmVsIiwicXVlc3Rpb25zIiwiYm91bmRhcnkiLCJiZWF1dHkiLCJob21lIiwiTW9ja1NhbGVzRmxvd1ByZXZpZXciLCJfczQiLCJjYW5SZWFkQ2F0YWxvZyIsImNhblJlYWRJbnZlbnRvcnkiLCJwcm9kdWN0cyIsInN0b2NrIiwidGFiIiwic2V0VGFiIiwiaW5kdXN0cnkiLCJzZXRJbmR1c3RyeSIsInNjcmlwdCIsInNvdXJjZVJvd3MiLCJmaWx0ZXIiLCJwcm9kdWN0IiwiZmxhdE1hcCIsInZhcmlhbnRzIiwidmFyaWFudCIsImFjdGl2ZSIsInByaWNlIiwic25hcHNob3QiLCJ2YXJpYW50SWQiLCJ3YXJlaG91c2VJZCIsIl8iLCJPYmplY3QiLCJlbnRyaWVzIiwicXVlc3Rpb24iLCJpbmRleCIsInJvdyIsInJlbmRlciIsIm5hbWUiLCJza3UiLCJhbGlnbiIsImF2YWlsYWJsZSIsImFzT2YiLCJNb2NrVXBzZWxsUHJldmlldyIsIl9zNSIsIl9jIiwiX2MyIiwiX2MzIiwiX2M0IiwiX2M1Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbImluZGV4LnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBY3Rpb25Hcm91cCwgRmllbGRHcm91cCwgRm9ybUZpZWxkcywgU2VjdGlvbkdyaWQsIFN1cmZhY2VDb250ZW50IH0gZnJvbSAnLi4vLi4vc2hhcmVkL3VpL2NvbXBvc2l0aW9uJztcbmltcG9ydCB7IHVzZUVmZmVjdCwgdXNlUmVmLCB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IHZpc3VhbFN4IH0gZnJvbSAnQC9zaGFyZWQvdWkvdmlzdWFsJztcbmltcG9ydCB7IExpbmsgYXMgUm91dGVyTGluaywgdXNlUGFyYW1zLCB1c2VTZWFyY2hQYXJhbXMgfSBmcm9tICdyZWFjdC1yb3V0ZXItZG9tJztcbmltcG9ydCB7IEFsZXJ0LCBBdmF0YXIsIEJveCwgQnV0dG9uLCBMaXN0LCBMaXN0SXRlbSwgTGlzdEl0ZW1CdXR0b24sIE1lbnVJdGVtLCBTdGFjaywgVGFiLCBUYWJzLCBUZXh0RmllbGQsIFR5cG9ncmFwaHkgfSBmcm9tICdAbXVpL21hdGVyaWFsJztcbmltcG9ydCBBcnJvd0JhY2tSb3VuZGVkIGZyb20gJ0BtdWkvaWNvbnMtbWF0ZXJpYWwvQXJyb3dCYWNrUm91bmRlZCc7XG5pbXBvcnQgdHlwZSB7IE1lc3NhZ2UsIFByb2R1Y3QsIFN0b2NrU25hcHNob3QgfSBmcm9tICdAYm90c2FsZXMvY29udHJhY3RzJztcbmltcG9ydCB7IGNvbG9ycywgdG9rZW5zIH0gZnJvbSAnQGJvdHNhbGVzL3Rva2Vucyc7XG5pbXBvcnQgeyB1c2VBcGksIHVzZUNvbW1hbmQgfSBmcm9tICdAL3NoYXJlZC9hcGkvaG9va3MnO1xuaW1wb3J0IHsgdXNlU2NvcGUsIHVzZUNhbiB9IGZyb20gJ0Avc2hhcmVkL21vZGVsL3Njb3BlJztcbmltcG9ydCB7IGRhdGVUaW1lIH0gZnJvbSAnQC9zaGFyZWQvbW9kZWwvZm9ybWF0JztcbmltcG9ydCB7IFBhZ2VIZWFkZXIsIFBhbmVsLCBRdWVyeVN0YXRlLCBUb29sYmFyLCBQYWdlciwgU3RhdHVzLCBNdXRhdGlvbkJ1dHRvbiwgRWRpdERpYWxvZywgRXJyb3JOb3RpY2UsIENvbmZpcm1EaWFsb2csIFJvdXRlTGluaywgRW1wdHksIERhdGFUYWJsZSwgQW1vdW50IH0gZnJvbSAnQC9zaGFyZWQvdWkvY29tcG9uZW50cyc7XG5pbXBvcnQgeyBsYXlvdXRTeCB9IGZyb20gJ0Avc2hhcmVkL3VpL2xheW91dCc7XG5pbXBvcnQgeyBDb252ZXJzYXRpb25Db21wb3NlciwgQ29udmVyc2F0aW9uQ29udGV4dFBhbmVsLCBDb252ZXJzYXRpb25NZXNzYWdlTGlzdCB9IGZyb20gJy4vY29udmVyc2F0aW9uLWNvbXBvbmVudHMnO1xuZXhwb3J0IGZ1bmN0aW9uIEluYm94UGFnZSgpIHtcbiAgICBjb25zdCB7IGNvbnZlcnNhdGlvbklkIH0gPSB1c2VQYXJhbXMoKTtcbiAgICBjb25zdCB7IHNob3AgfSA9IHVzZVNjb3BlKCk7XG4gICAgY29uc3QgW3BhcmFtcywgc2V0UGFyYW1zXSA9IHVzZVNlYXJjaFBhcmFtcygpO1xuICAgIGNvbnN0IHEgPSBwYXJhbXMuZ2V0KCdxJykgfHwgJyc7XG4gICAgY29uc3QgcmF3TW9kZSA9IHBhcmFtcy5nZXQoJ21vZGUnKTtcbiAgICBjb25zdCBtb2RlID0gKFsnYm90JywgJ2h1bWFuJywgJ3BhdXNlZCddIGFzIGNvbnN0KS5maW5kKHZhbHVlID0+IHZhbHVlID09PSByYXdNb2RlKTtcbiAgICBjb25zdCBzdGF0dXMgPSAoWydvcGVuJywgJ3Jlc29sdmVkJ10gYXMgY29uc3QpLmZpbmQodmFsdWUgPT4gdmFsdWUgPT09IHBhcmFtcy5nZXQoJ3N0YXR1cycpKTtcbiAgICBjb25zdCBjaGFubmVsSWQgPSBwYXJhbXMuZ2V0KCdjaGFubmVsSWQnKSB8fCB1bmRlZmluZWQ7XG4gICAgY29uc3QgYXNzaWduZWRVc2VySWQgPSBwYXJhbXMuZ2V0KCdhc3NpZ25lZFVzZXJJZCcpIHx8IHVuZGVmaW5lZDtcbiAgICBjb25zdCBsaXN0Q3Vyc29yUGFyYW0gPSBjb252ZXJzYXRpb25JZCA/ICdsaXN0Q3Vyc29yJyA6ICdjdXJzb3InO1xuICAgIGNvbnN0IGN1cnNvciA9IHBhcmFtcy5nZXQobGlzdEN1cnNvclBhcmFtKSB8fCB1bmRlZmluZWQ7XG4gICAgY29uc3QgbWV0YWRhdGEgPSB1c2VBcGkoJ2dldEluYm94TWV0YWRhdGEnKTtcbiAgICBjb25zdCBsaXN0ID0gdXNlQXBpKCdsaXN0Q29udmVyc2F0aW9ucycsIHsgcXVlcnk6IHsgcTogcSB8fCB1bmRlZmluZWQsIHN0YXR1cywgbW9kZSwgY2hhbm5lbElkLCBhc3NpZ25lZFVzZXJJZCwgY3Vyc29yLCBsaW1pdDogNDAgfSB9KTtcbiAgICBjb25zdCB1cGRhdGVGaWx0ZXIgPSAoa2V5OiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpID0+IHtcbiAgICAgICAgY29uc3QgbmV4dCA9IG5ldyBVUkxTZWFyY2hQYXJhbXMocGFyYW1zKTtcbiAgICAgICAgaWYgKHZhbHVlKVxuICAgICAgICAgICAgbmV4dC5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIG5leHQuZGVsZXRlKGtleSk7XG4gICAgICAgIG5leHQuZGVsZXRlKGxpc3RDdXJzb3JQYXJhbSk7XG4gICAgICAgIHNldFBhcmFtcyhuZXh0KTtcbiAgICB9O1xuICAgIGNvbnN0IGRldGFpbEhyZWYgPSAoaWQ6IHN0cmluZykgPT4ge1xuICAgICAgICBjb25zdCBuZXh0ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhwYXJhbXMpO1xuICAgICAgICBjb25zdCBsaXN0Q3Vyc29yID0gbmV4dC5nZXQobGlzdEN1cnNvclBhcmFtKTtcbiAgICAgICAgbmV4dC5kZWxldGUoJ2N1cnNvcicpO1xuICAgICAgICBuZXh0LmRlbGV0ZSgnbGlzdEN1cnNvcicpO1xuICAgICAgICBpZiAobGlzdEN1cnNvcilcbiAgICAgICAgICAgIG5leHQuc2V0KCdsaXN0Q3Vyc29yJywgbGlzdEN1cnNvcik7XG4gICAgICAgIGNvbnN0IHF1ZXJ5ID0gbmV4dC50b1N0cmluZygpO1xuICAgICAgICByZXR1cm4gYC9zLyR7c2hvcC5pZH0vaW5ib3gvJHtpZH0ke3F1ZXJ5ID8gYD8ke3F1ZXJ5fWAgOiAnJ31gO1xuICAgIH07XG4gICAgcmV0dXJuIDw+XG4gICAgICAgIDxQYWdlSGVhZGVyIHRpdGxlPVwiSOG7mXAgdGjGsCBraMOhY2ggaMOgbmdcIiBzdWJ0aXRsZT1cIkFJIHbDoCBuaMOibiB2acOqbiB0aeG6v3AgcXXhuqNuIHLDtSByw6BuZzsgY2jhu4kgZ+G7rWkga2hpIGNow61uaCBzw6FjaCBrw6puaCBjaG8gcGjDqXAuXCIgLz5cbiAgICAgICAgPFNlY3Rpb25HcmlkIGNvbHVtbnM9e3sgeHM6ICcxZnInLCBsZzogJzMwMHB4IG1pbm1heCgwLDFmciknIH19IGdlb21ldHJ5PXt7bWluSGVpZ2h0OiA2NTB9fT5cbiAgICAgICAgICAgIDxQYW5lbCBnZW9tZXRyeT17eyBkaXNwbGF5OiB7IHhzOiBjb252ZXJzYXRpb25JZCA/ICdub25lJyA6ICdibG9jaycsIGxnOiAnYmxvY2snIH0gfX0+XG4gICAgICAgICAgICAgICAgPFRvb2xiYXIgb3BlcmF0aW9uPVwibGlzdENvbnZlcnNhdGlvbnNcIiBwbGFjZWhvbGRlcj1cIlTDrG0gaOG7mWkgdGhv4bqhaeKAplwiIGN1cnNvclBhcmFtPXtsaXN0Q3Vyc29yUGFyYW19IGZpbHRlcnM9e1xuICAgICAgICAgICAgICAgIDxGaWVsZEdyb3VwIGRpcmVjdGlvbj17eyB4czogJ2NvbHVtbicsIHNtOiAncm93JyB9fSBmbGV4V3JhcD1cIndyYXBcIiByb2xlPVwiZ3JvdXBcIiBhcmlhLWxhYmVsPVwiQuG7mSBs4buNYyBo4buZaSB0aG/huqFpXCI+XG4gICAgICAgICAgICAgICAgICAgIDxUZXh0RmllbGQgc2VsZWN0IHNpemU9XCJzbWFsbFwiIGxhYmVsPVwiVHLhuqFuZyB0aMOhaVwiIHZhbHVlPXtzdGF0dXMgfHwgJyd9IG9uQ2hhbmdlPXtldmVudCA9PiB1cGRhdGVGaWx0ZXIoJ3N0YXR1cycsIGV2ZW50LnRhcmdldC52YWx1ZSl9IHN4PXt7IGZsZXg6IDEsIG1pbldpZHRoOiAxNDAgfX0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8TWVudUl0ZW0gdmFsdWU9XCJcIj5U4bqldCBj4bqjIHRy4bqhbmcgdGjDoWk8L01lbnVJdGVtPjxNZW51SXRlbSB2YWx1ZT1cIm9wZW5cIj7EkGFuZyBt4bufPC9NZW51SXRlbT48TWVudUl0ZW0gdmFsdWU9XCJyZXNvbHZlZFwiPsSQw6MgZ2nhuqNpIHF1eeG6v3Q8L01lbnVJdGVtPlxuICAgICAgICAgICAgICAgICAgICA8L1RleHRGaWVsZD5cbiAgICAgICAgICAgICAgICAgICAgPFRleHRGaWVsZCBzZWxlY3Qgc2l6ZT1cInNtYWxsXCIgbGFiZWw9XCJDaOG6vyDEkeG7mVwiIHZhbHVlPXttb2RlIHx8ICcnfSBvbkNoYW5nZT17ZXZlbnQgPT4gdXBkYXRlRmlsdGVyKCdtb2RlJywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gc3g9e3sgZmxleDogMSwgbWluV2lkdGg6IDE0MCB9fT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxNZW51SXRlbSB2YWx1ZT1cIlwiPlThuqV0IGPhuqMgY2jhur8gxJHhu5k8L01lbnVJdGVtPjxNZW51SXRlbSB2YWx1ZT1cImJvdFwiPkJvdDwvTWVudUl0ZW0+PE1lbnVJdGVtIHZhbHVlPVwiaHVtYW5cIj5OaMOibiB2acOqbjwvTWVudUl0ZW0+PE1lbnVJdGVtIHZhbHVlPVwicGF1c2VkXCI+VOG6oW0gZOG7q25nPC9NZW51SXRlbT5cbiAgICAgICAgICAgICAgICAgICAgPC9UZXh0RmllbGQ+XG4gICAgICAgICAgICAgICAgICAgIDxUZXh0RmllbGQgc2VsZWN0IHNpemU9XCJzbWFsbFwiIGxhYmVsPVwiS8OqbmhcIiB2YWx1ZT17Y2hhbm5lbElkIHx8ICcnfSBvbkNoYW5nZT17ZXZlbnQgPT4gdXBkYXRlRmlsdGVyKCdjaGFubmVsSWQnLCBldmVudC50YXJnZXQudmFsdWUpfSBzeD17eyBmbGV4OiAxLCBtaW5XaWR0aDogMTYwIH19PlxuICAgICAgICAgICAgICAgICAgICAgICAgPE1lbnVJdGVtIHZhbHVlPVwiXCI+VOG6pXQgY+G6oyBrw6puaDwvTWVudUl0ZW0+e21ldGFkYXRhLmRhdGE/LmRhdGEuY2hhbm5lbHMubWFwKGNoYW5uZWwgPT4gPE1lbnVJdGVtIGtleT17Y2hhbm5lbC5pZH0gdmFsdWU9e2NoYW5uZWwuaWR9PntjaGFubmVsLmRpc3BsYXlOYW1lfTwvTWVudUl0ZW0+KX1cbiAgICAgICAgICAgICAgICAgICAgPC9UZXh0RmllbGQ+XG4gICAgICAgICAgICAgICAgICAgIDxUZXh0RmllbGQgc2VsZWN0IHNpemU9XCJzbWFsbFwiIGxhYmVsPVwiTmjDom4gdmnDqm5cIiB2YWx1ZT17YXNzaWduZWRVc2VySWQgfHwgJyd9IG9uQ2hhbmdlPXtldmVudCA9PiB1cGRhdGVGaWx0ZXIoJ2Fzc2lnbmVkVXNlcklkJywgZXZlbnQudGFyZ2V0LnZhbHVlKX0gc3g9e3sgZmxleDogMSwgbWluV2lkdGg6IDE2MCB9fT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxNZW51SXRlbSB2YWx1ZT1cIlwiPlThuqV0IGPhuqMgbmjDom4gdmnDqm48L01lbnVJdGVtPnttZXRhZGF0YS5kYXRhPy5kYXRhLmFzc2lnbmVlcy5tYXAoYXNzaWduZWUgPT4gPE1lbnVJdGVtIGtleT17YXNzaWduZWUudXNlcklkfSB2YWx1ZT17YXNzaWduZWUudXNlcklkfT57YXNzaWduZWUuZGlzcGxheU5hbWV9PC9NZW51SXRlbT4pfVxuICAgICAgICAgICAgICAgICAgICA8L1RleHRGaWVsZD5cbiAgICAgICAgICAgICAgICA8L0ZpZWxkR3JvdXA+fSAvPlxuICAgICAgICAgICAgICAgIDxRdWVyeVN0YXRlIHF1ZXJ5PXtsaXN0fT5cbiAgICAgICAgICAgICAgICAgICAgPExpc3QgZGlzYWJsZVBhZGRpbmc+XG4gICAgICAgICAgICAgICAgICAgICAgICB7bGlzdC5kYXRhPy5kYXRhLm1hcChjID0+IDxMaXN0SXRlbSBrZXk9e2MuaWR9IGRpc2FibGVQYWRkaW5nPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxMaXN0SXRlbUJ1dHRvbiBzZWxlY3RlZD17Yy5pZCA9PT0gY29udmVyc2F0aW9uSWR9IGNvbXBvbmVudD17Um91dGVyTGlua30gdG89e2RldGFpbEhyZWYoYy5pZCl9IHN4PXtbbGF5b3V0U3guaW5ib3gubGlzdEluc2V0LCBsYXlvdXRTeC5pbmJveC5saXN0Q29udGVudEdhcCwgeyBhbGlnbkl0ZW1zOiAnc3RhcnQnLCBib3JkZXJCb3R0b206IDEsIGJvcmRlckNvbG9yOiAnZGl2aWRlcicgfV19PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8QXZhdGFyIHN4PXt7IGJnY29sb3I6IGNvbG9ycy5yYWlzZWQsIGNvbG9yOiAndGV4dC5wcmltYXJ5Jywgd2lkdGg6IDM4LCBoZWlnaHQ6IDM4IH19PntjLmRpc3BsYXlOYW1lLnNsaWNlKDAsIDEpfTwvQXZhdGFyPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8Qm94IHN4PXt7IG1pbldpZHRoOiAwLCBmbGV4OiAxIH19PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFN0YWNrIGRpcmVjdGlvbj1cInJvd1wiIGp1c3RpZnlDb250ZW50PVwic3BhY2UtYmV0d2VlblwiIHN4PXtbbGF5b3V0U3guc3VyZmFjZS5jb21wYWN0Q29udGVudEdhcCwgeyBhbGlnbkl0ZW1zOiAnY2VudGVyJyB9XX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFR5cG9ncmFwaHkgZm9udFdlaWdodD17dmlzdWFsU3gudHlwb2dyYXBoeS5mb250V2VpZ2h0LnN0cm9uZ30gbm9XcmFwPntjLmRpc3BsYXlOYW1lfTwvVHlwb2dyYXBoeT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Yy51bnJlYWRDb3VudCA+IDAgJiYgPEJveCBkYXRhLXRlc3RpZD1cImluYm94LXVucmVhZC1jb3VudFwiIHN4PXtbbGF5b3V0U3guaW5ib3gudW5yZWFkQ291bnRJbnNldCwgeyBiZ2NvbG9yOiAncHJpbWFyeS5tYWluJywgY29sb3I6IGNvbG9ycy5vbkFjY2VudCwgYm9yZGVyUmFkaXVzOiB2aXN1YWxTeC5yYWRpdXMubGFyZ2UsIGZvbnRTaXplOiB0b2tlbnMuZm9udFNpemVzLm1ldGEgfV19PntjLnVucmVhZENvdW50fTwvQm94Pn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvU3RhY2s+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VHlwb2dyYXBoeSB2YXJpYW50PVwiYm9keTJcIiBub1dyYXAgY29sb3I9XCJ0ZXh0LnNlY29uZGFyeVwiIHN4PXtbbGF5b3V0U3guc3VyZmFjZS50aXRsZURlc2NyaXB0aW9uR2FwLCB7IGRpc3BsYXk6ICdibG9jaycgfV19PntjLmxhc3RNZXNzYWdlUHJldmlldyB8fCAnQ2jGsGEgY8OzIHRpbiBuaOG6r24nfTwvVHlwb2dyYXBoeT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxCb3ggc3g9e2xheW91dFN4LmluYm94Lmxpc3RTdGF0dXNCZWZvcmVHYXB9PjxTdGF0dXMgdmFsdWU9e2MubW9kZX0gLz48L0JveD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9MaXN0SXRlbUJ1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvTGlzdEl0ZW0+KX1cbiAgICAgICAgICAgICAgICAgICAgPC9MaXN0PlxuICAgICAgICAgICAgICAgICAgICB7IWxpc3QuZGF0YT8uZGF0YS5sZW5ndGggJiYgPEVtcHR5IHRleHQ9XCJDaMawYSBjw7MgaOG7mWkgdGhv4bqhaSBwaMO5IGjhu6NwLlwiIC8+fVxuICAgICAgICAgICAgICAgICAgICA8UGFnZXIgcGFnZT17bGlzdC5kYXRhPy5wYWdlfSBjdXJzb3JQYXJhbT17bGlzdEN1cnNvclBhcmFtfSAvPlxuICAgICAgICAgICAgICAgIDwvUXVlcnlTdGF0ZT5cbiAgICAgICAgICAgIDwvUGFuZWw+XG4gICAgICAgICAgICB7Y29udmVyc2F0aW9uSWQgPyA8Q29udmVyc2F0aW9uUGFuZWwga2V5PXtjb252ZXJzYXRpb25JZH0gY29udmVyc2F0aW9uSWQ9e2NvbnZlcnNhdGlvbklkfSAvPiA6IDxQYW5lbD48RW1wdHkgdGV4dD1cIkNo4buNbiBt4buZdCBjdeG7mWMgdHLDsiBjaHV54buHbiDEkeG7gyB4ZW0gbOG7i2NoIHPhu60sIHRp4bq/cCBxdeG6o24gdsOgIHThuqFvIMSRxqFuLlwiIC8+PC9QYW5lbD59XG4gICAgICAgIDwvU2VjdGlvbkdyaWQ+XG4gICAgPC8+O1xufVxuZnVuY3Rpb24gQ29udmVyc2F0aW9uUGFuZWwoeyBjb252ZXJzYXRpb25JZCB9OiB7XG4gICAgY29udmVyc2F0aW9uSWQ6IHN0cmluZztcbn0pIHtcbiAgICBjb25zdCB7IHNob3AgfSA9IHVzZVNjb3BlKCk7XG4gICAgY29uc3QgW3BhcmFtc10gPSB1c2VTZWFyY2hQYXJhbXMoKTtcbiAgICBjb25zdCBjID0gdXNlQXBpKCdnZXRDb252ZXJzYXRpb24nLCB7IHBhdGg6IHsgY29udmVyc2F0aW9uSWQgfSB9KTtcbiAgICBjb25zdCBtZXNzYWdlQ3Vyc29yID0gcGFyYW1zLmdldCgnY3Vyc29yJykgfHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IG1lc3NhZ2VzID0gdXNlQXBpKCdsaXN0TWVzc2FnZXMnLCB7IHBhdGg6IHsgY29udmVyc2F0aW9uSWQgfSwgcXVlcnk6IHsgY3Vyc29yOiBtZXNzYWdlQ3Vyc29yLCBsaW1pdDogMTAwIH0gfSk7XG4gICAgY29uc3QgdGFrZW92ZXIgPSB1c2VDb21tYW5kKCd0YWtlb3ZlckNvbnZlcnNhdGlvbicsIFsnZ2V0Q29udmVyc2F0aW9uJywgJ2xpc3RDb252ZXJzYXRpb25zJ10pO1xuICAgIGNvbnN0IHJlbGVhc2UgPSB1c2VDb21tYW5kKCdyZWxlYXNlQ29udmVyc2F0aW9uJywgWydnZXRDb252ZXJzYXRpb24nLCAnbGlzdENvbnZlcnNhdGlvbnMnXSk7XG4gICAgY29uc3QgcmVzb2x2ZSA9IHVzZUNvbW1hbmQoJ3Jlc29sdmVDb252ZXJzYXRpb24nLCBbJ2dldENvbnZlcnNhdGlvbicsICdsaXN0Q29udmVyc2F0aW9ucyddKTtcbiAgICBjb25zdCBmZWVkYmFjayA9IHVzZUNvbW1hbmQoJ2NyZWF0ZUZlZWRiYWNrJywgWydsaXN0RmVlZGJhY2snXSk7XG4gICAgY29uc3QgW2FjdGlvbiwgc2V0QWN0aW9uXSA9IHVzZVN0YXRlPCd0YWtlb3ZlcicgfCAncmVsZWFzZScgfCAncmVzb2x2ZScgfCBudWxsPihudWxsKTtcbiAgICBjb25zdCBbcmF0aW5nTWVzc2FnZSwgc2V0UmF0aW5nTWVzc2FnZV0gPSB1c2VTdGF0ZTxNZXNzYWdlIHwgbnVsbD4obnVsbCk7XG4gICAgY29uc3QgW2NvcnJlY3Rpb24sIHNldENvcnJlY3Rpb25dID0gdXNlU3RhdGUoJycpO1xuICAgIGNvbnN0IFtyYXRpbmcsIHNldFJhdGluZ10gPSB1c2VTdGF0ZTwncG9zaXRpdmUnIHwgJ25lZ2F0aXZlJz4oJ25lZ2F0aXZlJyk7XG4gICAgY29uc3QgZW5kID0gdXNlUmVmPEhUTUxEaXZFbGVtZW50PihudWxsKTtcblxuICAgIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgICAgIGlmICghbWVzc2FnZUN1cnNvcikgZW5kLmN1cnJlbnQ/LnNjcm9sbEludG9WaWV3KHsgYmxvY2s6ICduZWFyZXN0JywgYmVoYXZpb3I6ICdhdXRvJyB9KTtcbiAgICB9LCBbbWVzc2FnZXMuZGF0YSwgbWVzc2FnZUN1cnNvcl0pO1xuXG4gICAgY29uc3QgaW5ib3hIcmVmID0gKCkgPT4ge1xuICAgICAgICBjb25zdCBuZXh0ID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhwYXJhbXMpO1xuICAgICAgICBjb25zdCBsaXN0Q3Vyc29yID0gbmV4dC5nZXQoJ2xpc3RDdXJzb3InKTtcbiAgICAgICAgbmV4dC5kZWxldGUoJ2xpc3RDdXJzb3InKTtcbiAgICAgICAgbmV4dC5kZWxldGUoJ2N1cnNvcicpO1xuICAgICAgICBpZiAobGlzdEN1cnNvcikgbmV4dC5zZXQoJ2N1cnNvcicsIGxpc3RDdXJzb3IpO1xuICAgICAgICBjb25zdCBxdWVyeSA9IG5leHQudG9TdHJpbmcoKTtcbiAgICAgICAgcmV0dXJuIGAvcy8ke3Nob3AuaWR9L2luYm94JHtxdWVyeSA/IGA/JHtxdWVyeX1gIDogJyd9YDtcbiAgICB9O1xuXG4gICAgY29uc3QgY29udmVyc2F0aW9uID0gYy5kYXRhPy5kYXRhO1xuICAgIHJldHVybiAoXG4gICAgICAgIDxRdWVyeVN0YXRlIHF1ZXJ5PXtjfSBwZW5kaW5nUHJvZmlsZT1cInNlY3Rpb25cIj5cbiAgICAgICAgICAgIHtjb252ZXJzYXRpb24gJiYgKFxuICAgICAgICAgICAgICAgIDxTZWN0aW9uR3JpZCBkYXRhLXRlc3RpZD1cImluYm94LWNvbnZlcnNhdGlvbi1sYXlvdXRcIiBjb2x1bW5zPXt7IHhzOiAnMWZyJywgeGw6ICdtaW5tYXgoMCwxZnIpIDI2MHB4JyB9fSBnZW9tZXRyeT17e21pbldpZHRoOiAwfX0+XG4gICAgICAgICAgICAgICAgICAgIDxCb3ggZGF0YS10ZXN0aWQ9XCJpbmJveC10aHJlYWRcIiBjb21wb25lbnQ9XCJzZWN0aW9uXCIgYXJpYS1sYWJlbD1cIk7hu5lpIGR1bmcgaOG7mWkgdGhv4bqhaVwiIHN4PXt7IG1pbldpZHRoOiAwLCBoZWlnaHQ6IHsgeGw6IDY1MCB9IH19PlxuICAgICAgICAgICAgICAgICAgICAgICAgPFBhbmVsIGdlb21ldHJ5PXt7IGRpc3BsYXk6ICdmbGV4JywgZmxleERpcmVjdGlvbjogJ2NvbHVtbicsIGhlaWdodDogJzEwMCUnIH19PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxBY3Rpb25Hcm91cCBkaXJlY3Rpb249XCJyb3dcIiBhbGlnbkl0ZW1zPVwiY2VudGVyXCIganVzdGlmeUNvbnRlbnQ9XCJzcGFjZS1iZXR3ZWVuXCIgYm9keU1vZGU9XCJoZWFkZXJcIiBnZW9tZXRyeT17eyBmbGV4OiAnMCAwIGF1dG8nIH19PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8U3RhY2sgZGlyZWN0aW9uPVwicm93XCIgYWxpZ25JdGVtcz1cImNlbnRlclwiIHN4PXtbbGF5b3V0U3guc3VyZmFjZS5jb21wYWN0Q29udGVudEdhcCwgeyBmbGV4V3JhcDogJ3dyYXAnIH1dfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxCdXR0b24gY29tcG9uZW50PXtSb3V0ZXJMaW5rfSB0bz17aW5ib3hIcmVmKCl9IHN4PXt7IGRpc3BsYXk6IHsgbGc6ICdub25lJyB9LCBtaW5XaWR0aDogNDQgfX0gYXJpYS1sYWJlbD1cIkRhbmggc8OhY2ggaOG7mWkgdGhv4bqhaVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxBcnJvd0JhY2tSb3VuZGVkIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxBdmF0YXIgc3g9e3sgYmdjb2xvcjogY29sb3JzLnNlbGVjdGVkLCBjb2xvcjogJ3ByaW1hcnkubWFpbicgfX0+e2NvbnZlcnNhdGlvbi5kaXNwbGF5TmFtZS5zbGljZSgwLCAxKX08L0F2YXRhcj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxCb3g+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFR5cG9ncmFwaHkgY29tcG9uZW50PVwiaDJcIiB2YXJpYW50PVwiaDZcIj57Y29udmVyc2F0aW9uLmRpc3BsYXlOYW1lfTwvVHlwb2dyYXBoeT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VHlwb2dyYXBoeSB2YXJpYW50PVwiY2FwdGlvblwiIGNvbG9yPVwidGV4dC5zZWNvbmRhcnlcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge2NvbnZlcnNhdGlvbi5tb2RlID09PSAnaHVtYW4nID8gJ05ow6JuIHZpw6puIMSRYW5nIHRp4bq/cCBxdeG6o24nIDogJ1Ry4bujIGzDvSB04buxIMSR4buZbmcnfSDCtyB7Y29udmVyc2F0aW9uLmlkfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvVHlwb2dyYXBoeT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L1N0YWNrPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8QWN0aW9uR3JvdXAgZGlyZWN0aW9uPVwicm93XCIgPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPE11dGF0aW9uQnV0dG9uIHBlcm1pc3Npb249XCJjb252ZXJzYXRpb25zLmFzc2lnblwiIHZhcmlhbnQ9XCJvdXRsaW5lZFwiIG9uQ2xpY2s9eygpID0+IHNldEFjdGlvbihjb252ZXJzYXRpb24ubW9kZSA9PT0gJ2h1bWFuJyA/ICdyZWxlYXNlJyA6ICd0YWtlb3ZlcicpfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7Y29udmVyc2F0aW9uLm1vZGUgPT09ICdodW1hbicgPyAnVHLhuqMgbOG6oWkgYm90JyA6ICdUaeG6v3AgcXXhuqNuJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvTXV0YXRpb25CdXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8TXV0YXRpb25CdXR0b24gcGVybWlzc2lvbj1cImNvbnZlcnNhdGlvbnMuYXNzaWduXCIgZGlzYWJsZWQ9e2NvbnZlcnNhdGlvbi5zdGF0dXMgPT09ICdyZXNvbHZlZCd9IG9uQ2xpY2s9eygpID0+IHNldEFjdGlvbigncmVzb2x2ZScpfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHaeG6o2kgcXV54bq/dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9NdXRhdGlvbkJ1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9BY3Rpb25Hcm91cD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0FjdGlvbkdyb3VwPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtjb252ZXJzYXRpb24uc2VuZEVsaWdpYmlsaXR5LnN0YXRlICE9PSAnYWxsb3dlZCcgJiYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8Qm94IHN4PXtsYXlvdXRTeC5pbmJveC5wYW5lSW5zZXR9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPEFsZXJ0IHNldmVyaXR5PVwid2FybmluZ1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEtow7RuZyDEkcaw4bujYyBn4butaSB0aW46IHtjb252ZXJzYXRpb24uc2VuZEVsaWdpYmlsaXR5LnJlYXNvbkNvZGUgfHwgJ0NoxrBhIHjDoWMgbWluaCBxdXnhu4FuIGfhu61pJ30uIEtow7RuZyB04buxIHbGsOG7o3QgY+G7rWEgc+G7lS9jaMOtbmggc8OhY2gga8OqbmguXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0FsZXJ0PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxCb3ggZGF0YS10ZXN0aWQ9XCJpbmJveC1tZXNzYWdlLWxpc3RcIiBzeD17W2xheW91dFN4LmluYm94LnBhbmVJbnNldCwgeyBmbGV4OiAxLCBtaW5IZWlnaHQ6IHsgeHM6IDM1MCwgeGw6IDAgfSwgbWF4SGVpZ2h0OiA1NTAsIG92ZXJmbG93WTogJ2F1dG8nLCBiYWNrZ3JvdW5kOiBjb2xvcnMuY2FudmFzIH1dfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFF1ZXJ5U3RhdGUgcXVlcnk9e21lc3NhZ2VzfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxTdGFjayBkYXRhLXRlc3RpZD1cImluYm94LW1lc3NhZ2UtZ3JvdXBzXCIgc3g9e2xheW91dFN4LmluYm94Lm1lc3NhZ2VHcm91cEdhcH0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPENvbnZlcnNhdGlvbk1lc3NhZ2VMaXN0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzPXttZXNzYWdlcy5kYXRhPy5kYXRhIHx8IFtdfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aW1lem9uZT17c2hvcC50aW1lem9uZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25SYXRlPXttZXNzYWdlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFJhdGluZ01lc3NhZ2UobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRDb3JyZWN0aW9uKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgcmVmPXtlbmR9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L1N0YWNrPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyFtZXNzYWdlcy5kYXRhPy5kYXRhLmxlbmd0aCAmJiA8RW1wdHkgdGV4dD1cIkNoxrBhIGPDsyB0aW4gbmjhuq9uLlwiIC8+fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPFBhZ2VyIHBhZ2U9e21lc3NhZ2VzLmRhdGE/LnBhZ2V9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvUXVlcnlTdGF0ZT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8Q29udmVyc2F0aW9uQ29tcG9zZXIgY29udmVyc2F0aW9uPXtjb252ZXJzYXRpb259IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L1BhbmVsPlxuICAgICAgICAgICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgICAgICAgICAgPENvbnZlcnNhdGlvbkNvbnRleHRQYW5lbCBjb252ZXJzYXRpb249e2NvbnZlcnNhdGlvbn0+XG4gICAgICAgICAgICAgICAgICAgICAgICB7X19NT0NLX18gJiYgPE1vY2tTYWxlc0Zsb3dQcmV2aWV3IGN1c3RvbWVySWQ9e2NvbnZlcnNhdGlvbi5jdXN0b21lcklkfSBjb252ZXJzYXRpb25JZD17Y29udmVyc2F0aW9uLmlkfSAvPn1cbiAgICAgICAgICAgICAgICAgICAgICAgIHtfX01PQ0tfXyAmJiA8TW9ja01lZGlhUHJldmlldyAvPn1cbiAgICAgICAgICAgICAgICAgICAgICAgIHtfX01PQ0tfXyAmJiA8TW9ja1Vwc2VsbFByZXZpZXcgLz59XG4gICAgICAgICAgICAgICAgICAgIDwvQ29udmVyc2F0aW9uQ29udGV4dFBhbmVsPlxuICAgICAgICAgICAgICAgICAgICA8Q29uZmlybURpYWxvZ1xuICAgICAgICAgICAgICAgICAgICAgICAgb3Blbj17ISFhY3Rpb259XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZT17YWN0aW9uID09PSAndGFrZW92ZXInID8gJ1Rp4bq/cCBxdeG6o24gY3Xhu5ljIHRyw7IgY2h1eeG7h24nIDogYWN0aW9uID09PSAncmVsZWFzZScgPyAnVHLhuqMgY3Xhu5ljIHRyw7IgY2h1eeG7h24gduG7gSBib3QnIDogJ8SQw6FuaCBk4bqldSDEkcOjIGdp4bqjaSBxdXnhur90J31cbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uPXthY3Rpb24gPT09ICd0YWtlb3ZlcicgPyAnQ8OhYyBjw6J1IHRy4bqjIGzhu51pIEFJIMSRYW5nIGNo4budIHBo4bqjaSBi4buLIGNo4bq3biB0csaw4bubYyBraGkgZ+G7rWkuJyA6ICdI4buHIHRo4buRbmcga2nhu4NtIGzhuqFpIHF1eeG7gW4gdsOgIHBoacOqbiBi4bqjbiBo4buZaSB0aG/huqFpLid9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1aXJlUmVhc29uXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsb3NlPXsoKSA9PiBzZXRBY3Rpb24obnVsbCl9XG4gICAgICAgICAgICAgICAgICAgICAgICBidXN5PXt0YWtlb3Zlci5wZW5kaW5nIHx8IHJlbGVhc2UucGVuZGluZyB8fCByZXNvbHZlLnBlbmRpbmd9XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcj17dGFrZW92ZXIuZXJyb3IgfHwgcmVsZWFzZS5lcnJvciB8fCByZXNvbHZlLmVycm9yfVxuICAgICAgICAgICAgICAgICAgICAgICAgb25Db25maXJtPXtyZWFzb24gPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG9wZXJhdGlvbiA9IGFjdGlvbiA9PT0gJ3Rha2VvdmVyJyA/IHRha2VvdmVyIDogYWN0aW9uID09PSAncmVsZWFzZScgPyByZWxlYXNlIDogcmVzb2x2ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3BlcmF0aW9uLmV4ZWN1dGUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiB7IGNvbnZlcnNhdGlvbklkIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb246IGNvbnZlcnNhdGlvbi52ZXJzaW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OiB7IGV4cGVjdGVkVmVyc2lvbjogY29udmVyc2F0aW9uLnZlcnNpb24sIHJlYXNvbiB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgICAgICAgPEVkaXREaWFsb2dcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZW49eyEhcmF0aW5nTWVzc2FnZX1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlPVwixJDDoW5oIGdpw6EgY8OidSB0cuG6oyBs4budaVwiXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsb3NlPXsoKSA9PiBzZXRSYXRpbmdNZXNzYWdlKG51bGwpfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnVzeT17ZmVlZGJhY2sucGVuZGluZ31cbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbnM9eyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhcmlhbnQ9XCJjb250YWluZWRcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17ZmVlZGJhY2sucGVuZGluZ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DbGljaz17YXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFyYXRpbmdNZXNzYWdlKSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGZlZWRiYWNrLmV4ZWN1dGUoeyBib2R5OiB7IGNvbnZlcnNhdGlvbklkLCBtZXNzYWdlSWQ6IHJhdGluZ01lc3NhZ2UuaWQsIHJhdGluZywgY29ycmVjdGlvbiB9IH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFJhdGluZ01lc3NhZ2UobnVsbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgdmlzaWJsZSBlcnJvciByZW1haW5zIGF2YWlsYWJsZSBmb3IgcmV0cnkuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBMxrB1IHBo4bqjbiBo4buTaVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvQnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgPEVycm9yTm90aWNlIGVycm9yPXtmZWVkYmFjay5lcnJvcn0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxGb3JtRmllbGRzID5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VHlwb2dyYXBoeSBzeD17eyB3aGl0ZVNwYWNlOiAncHJlLXdyYXAnIH19PntyYXRpbmdNZXNzYWdlPy50ZXh0fTwvVHlwb2dyYXBoeT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8VGV4dEZpZWxkIGxhYmVsPVwixJDDoW5oIGdpw6FcIiBzZWxlY3QgdmFsdWU9e3JhdGluZ30gb25DaGFuZ2U9e2V2ZW50ID0+IHNldFJhdGluZyhldmVudC50YXJnZXQudmFsdWUgYXMgdHlwZW9mIHJhdGluZyl9IGF1dG9Gb2N1cz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPE1lbnVJdGVtIHZhbHVlPVwicG9zaXRpdmVcIj5I4buvdSDDrWNoPC9NZW51SXRlbT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPE1lbnVJdGVtIHZhbHVlPVwibmVnYXRpdmVcIj5D4bqnbiBz4butYTwvTWVudUl0ZW0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9UZXh0RmllbGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPFRleHRGaWVsZCBsYWJlbD1cIk7hu5lpIGR1bmcgxJHhu4EgeHXhuqV0IHPhu61hXCIgbXVsdGlsaW5lIG1pblJvd3M9ezR9IHZhbHVlPXtjb3JyZWN0aW9ufSBvbkNoYW5nZT17ZXZlbnQgPT4gc2V0Q29ycmVjdGlvbihldmVudC50YXJnZXQudmFsdWUpfSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxBbGVydCBzZXZlcml0eT1cImluZm9cIj5QaOG6o24gaOG7k2kga2jDtG5nIHThu7EgdHLhu58gdGjDoG5oIGtp4bq/biB0aOG7qWMgxJHDoyB4deG6pXQgYuG6o24uIEPhuqduIG5nxrDhu51pIGR1eeG7h3QgdsOgIGtp4buDbSB0aOG7rS48L0FsZXJ0PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9Gb3JtRmllbGRzPlxuICAgICAgICAgICAgICAgICAgICA8L0VkaXREaWFsb2c+XG4gICAgICAgICAgICAgICAgPC9TZWN0aW9uR3JpZD5cbiAgICAgICAgICAgICl9XG4gICAgICAgIDwvUXVlcnlTdGF0ZT5cbiAgICApO1xufVxyXG5mdW5jdGlvbiBNb2NrTWVkaWFQcmV2aWV3KCkge1xuICAgIGNvbnN0IFtvcGVuLCBzZXRPcGVuXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgICByZXR1cm4gPFN1cmZhY2VDb250ZW50IGJlZm9yZUdhcD1cInN1cmZhY2VcIj5cbiAgICAgICAgPEFsZXJ0IHNldmVyaXR5PVwiaW5mb1wiIGFjdGlvbj17PEJ1dHRvbiBzaXplPVwic21hbGxcIiBvbkNsaWNrPXsoKSA9PiBzZXRPcGVuKHZhbHVlID0+ICF2YWx1ZSl9PntvcGVuID8gJ+G6qG4gbeG6q3UgbWVkaWEnIDogJ1hlbSBt4bqrdSDhuqNuaCB2w6AgdGluIHRob+G6oWknfTwvQnV0dG9uPn0+XG4gICAgICAgICAgICBQcmV2aWV3IGNo4buJIGTDuW5nIGThu68gbGnhu4d1IHThu5VuZyBo4bujcC4gTWVzc2FnZSBjb250cmFjdCBjaMawYSBjw7MgbWVkaWE7IG7hu5lpIGR1bmcgbeG6q3Uga2jDtG5nIMSRxrDhu6NjIGfhu61pLCBwaMOhdCBob+G6t2MgZ+G6r24gdsOgbyBo4buZaSB0aG/huqFpLlxuICAgICAgICA8L0FsZXJ0PlxuICAgICAgICB7b3BlbiAmJiA8U3RhY2sgcm9sZT1cInN0YXR1c1wiIGRhdGEtdGVzdGlkPVwibW9jay1tZWRpYS1wcmV2aWV3XCIgc3g9e1tsYXlvdXRTeC5zdXJmYWNlLmNvbXBhY3RDb250ZW50R2FwLCBsYXlvdXRTeC5zdXJmYWNlLmNvbXBhY3RJbnNldCwgeyBib3JkZXI6IDEsIGJvcmRlckNvbG9yOiAnZGl2aWRlcicsIGJvcmRlclJhZGl1czogdmlzdWFsU3gucmFkaXVzLmNvbnRyb2wgfV19PlxuICAgICAgICAgICAgPEJveCByb2xlPVwiaW1nXCIgYXJpYS1sYWJlbD1cIuG6om5oIHPhuqNuIHBo4bqpbSBt4bqrdSwga2jDtG5nIHBo4bqjaSB04buHcCBraMOhY2ggZ+G7rWlcIiBzeD17eyBtaW5IZWlnaHQ6IDgwLCBkaXNwbGF5OiAnZ3JpZCcsIHBsYWNlSXRlbXM6ICdjZW50ZXInLCBib3JkZXJSYWRpdXM6IHZpc3VhbFN4LnJhZGl1cy5jb250cm9sLCBiZ2NvbG9yOiAnYWN0aW9uLmhvdmVyJyB9fT5cbiAgICAgICAgICAgICAgICA8VHlwb2dyYXBoeSB2YXJpYW50PVwiYm9keTJcIj7huqJuaCBz4bqjbiBwaOG6qW0gbeG6q3UgwrcgREVNTy1NRURJQS1JTUFHRS0wMTwvVHlwb2dyYXBoeT5cbiAgICAgICAgICAgIDwvQm94PlxuICAgICAgICAgICAgPFR5cG9ncmFwaHkgdmFyaWFudD1cImJvZHkyXCIgZm9udFdlaWdodD17dmlzdWFsU3gudHlwb2dyYXBoeS5mb250V2VpZ2h0LnN0cm9uZ30+VGluIHRob+G6oWkgbeG6q3UgwrcgMDA6MDggwrcgY2jGsGEgcGjDoXQgw6JtIHRoYW5oPC9UeXBvZ3JhcGh5PlxuICAgICAgICAgICAgPFR5cG9ncmFwaHkgdmFyaWFudD1cImNhcHRpb25cIiBjb2xvcj1cInRleHQuc2Vjb25kYXJ5XCI+QuG6o24gY2jDqXAgdGjhu606IOKAnFNob3AgY8OybiBtw6B1IHhhbmgga2jDtG5nIOG6oT/igJ0gwrcgY2jGsGEgxJHGsOG7o2MgbmfGsOG7nWkgZMO5bmcgeMOhYyBuaOG6rW4uPC9UeXBvZ3JhcGh5PlxuICAgICAgICA8L1N0YWNrPn1cbiAgICA8L1N1cmZhY2VDb250ZW50Pjtcbn1cblxudHlwZSBTYWxlc1ByZXZpZXdUYWIgPSAnc2NyaXB0JyB8ICdzb3VyY2VzJyB8ICdvcmRlcicgfCAnY29uZmlybWF0aW9uJztcbnR5cGUgU2FsZXNTb3VyY2VSb3cgPSB7XG4gICAga2V5OiBzdHJpbmc7XG4gICAgcHJvZHVjdDogUHJvZHVjdDtcbiAgICB2YXJpYW50OiBQcm9kdWN0Wyd2YXJpYW50cyddW251bWJlcl07XG4gICAgc25hcHNob3Q6IFN0b2NrU25hcHNob3Q7XG59O1xuY29uc3Qgc2FtcGxlU2FsZXNTY3JpcHRzID0ge1xuICAgIGZhc2hpb246IHtcbiAgICAgICAgbGFiZWw6ICdUaOG7nWkgdHJhbmcnLFxuICAgICAgICBxdWVzdGlvbnM6IFsnQuG6oW4gxJFhbmcgdMOsbSBraeG7g3UgZMOhbmcgdsOgIGThu4twIHPhu60gZOG7pW5nIG7DoG8/JywgJ0LhuqFuIG114buRbiB4ZW0gbcOgdSB2w6Aga8OtY2ggY+G7oSBuw6BvPycsICdDaG8gbcOsbmggeGluIGtodSB24buxYyBnaWFvIGjDoG5nIMSR4buDIGtp4buDbSB0cmEgcGjDrS4nXSxcbiAgICAgICAgYm91bmRhcnk6ICdDaOG7iSB0xrAgduG6pW4gY2jhuqV0IGxp4buHdSwga8OtY2ggY+G7oSB2w6AgY2jDrW5oIHPDoWNoIMSRw6MgY8OzIG5ndeG7k247IHRoaeG6v3UgdGjDtG5nIHRpbiB0aMOsIGjhu49pIGzhuqFpIGhv4bq3YyBjaHV54buDbiBuaMOibiB2acOqbi4nLFxuICAgIH0sXG4gICAgYmVhdXR5OiB7XG4gICAgICAgIGxhYmVsOiAnTeG7uSBwaOG6qW0nLFxuICAgICAgICBxdWVzdGlvbnM6IFsnQuG6oW4gxJFhbmcgdMOsbSBz4bqjbiBwaOG6qW0gY2hvIG5odSBj4bqndSBuw6BvPycsICdC4bqhbiBjw7MgZOG7iyDhu6luZyBob+G6t2MgdGjDoG5oIHBo4bqnbiBj4bqnbiB0csOhbmgga2jDtG5nPycsICdC4bqhbiBtdeG7kW4gbmjDom4gdmnDqm4gdMawIHbhuqVuIHRow6ptIHRyxrDhu5tjIGtoaSBjaOG7jW4/J10sXG4gICAgICAgIGJvdW5kYXJ5OiAnS2jDtG5nIGNo4bqpbiDEkW/DoW4sIGjhu6lhIGhp4buHdSBxdeG6oyDEkWnhu4F1IHRy4buLIGhv4bq3YyBraOG6s25nIMSR4buLbmggcGjDuSBo4bujcCBraGkgY2jGsGEgY8OzIHRow7RuZyB0aW4gbmd14buTbi4nLFxuICAgIH0sXG4gICAgaG9tZToge1xuICAgICAgICBsYWJlbDogJ0dpYSBk4bulbmcnLFxuICAgICAgICBxdWVzdGlvbnM6IFsnQuG6oW4gY+G6p24gZMO5bmcgc+G6o24gcGjhuqltIHRyb25nIGtow7RuZyBnaWFuIG7DoG8/JywgJ0vDrWNoIHRoxrDhu5tjIGhv4bq3YyBjw7RuZyBzdeG6pXQgbW9uZyBtdeG7kW4gbMOgIGJhbyBuaGnDqnU/JywgJ0LhuqFuIGPhuqduIGtp4buDbSB0cmEgYuG6o28gaMOgbmggaGF5IGPDoWNoIGzhuq9wIMSR4bq3dD8nXSxcbiAgICAgICAgYm91bmRhcnk6ICdUaGnhur91IGvDrWNoIHRoxrDhu5tjLCBi4bqjbyBow6BuaCBob+G6t2MgaMaw4bubbmcgZOG6q24gY8OzIG5ndeG7k24gdGjDrCBraMO0bmcgdOG7sSBzdXkgZGnhu4VuOyBjaHV54buDbiBuaMOibiB2acOqbiB4w6FjIG1pbmguJyxcbiAgICB9LFxufSBhcyBjb25zdDtcblxuZnVuY3Rpb24gTW9ja1NhbGVzRmxvd1ByZXZpZXcoeyBjdXN0b21lcklkLCBjb252ZXJzYXRpb25JZCB9OiB7IGN1c3RvbWVySWQ6IHN0cmluZzsgY29udmVyc2F0aW9uSWQ6IHN0cmluZyB9KSB7XG4gICAgY29uc3QgeyBzaG9wIH0gPSB1c2VTY29wZSgpO1xuICAgIGNvbnN0IGNhblJlYWRDYXRhbG9nID0gdXNlQ2FuKCdjYXRhbG9nLnJlYWQnKTtcbiAgICBjb25zdCBjYW5SZWFkSW52ZW50b3J5ID0gdXNlQ2FuKCdpbnZlbnRvcnkucmVhZCcpO1xuICAgIGNvbnN0IHByb2R1Y3RzID0gdXNlQXBpKCdsaXN0UHJvZHVjdHMnLCB7IHF1ZXJ5OiB7IGxpbWl0OiAxMDAgfSB9LCBjYW5SZWFkQ2F0YWxvZyk7XG4gICAgY29uc3Qgc3RvY2sgPSB1c2VBcGkoJ2xpc3RTdG9ja1NuYXBzaG90cycsIHsgcXVlcnk6IHsgbGltaXQ6IDEwMCB9IH0sIGNhblJlYWRJbnZlbnRvcnkpO1xuICAgIGNvbnN0IFt0YWIsIHNldFRhYl0gPSB1c2VTdGF0ZTxTYWxlc1ByZXZpZXdUYWI+KCdzY3JpcHQnKTtcbiAgICBjb25zdCBbaW5kdXN0cnksIHNldEluZHVzdHJ5XSA9IHVzZVN0YXRlPGtleW9mIHR5cGVvZiBzYW1wbGVTYWxlc1NjcmlwdHM+KCdmYXNoaW9uJyk7XG4gICAgY29uc3Qgc2NyaXB0ID0gc2FtcGxlU2FsZXNTY3JpcHRzW2luZHVzdHJ5XTtcbiAgICBjb25zdCBzb3VyY2VSb3dzID0gKHByb2R1Y3RzLmRhdGE/LmRhdGEgfHwgW10pLmZpbHRlcihwcm9kdWN0ID0+IHByb2R1Y3Quc3RhdHVzID09PSAnYWN0aXZlJylcbiAgICAgICAgLmZsYXRNYXA8U2FsZXNTb3VyY2VSb3c+KHByb2R1Y3QgPT4gcHJvZHVjdC52YXJpYW50cy5maWx0ZXIodmFyaWFudCA9PiB2YXJpYW50LmFjdGl2ZSAmJiB2YXJpYW50LnByaWNlKVxuICAgICAgICAgICAgLmZsYXRNYXAodmFyaWFudCA9PiAoc3RvY2suZGF0YT8uZGF0YSB8fCBbXSkuZmlsdGVyKHNuYXBzaG90ID0+IHNuYXBzaG90LnZhcmlhbnRJZCA9PT0gdmFyaWFudC5pZClcbiAgICAgICAgICAgICAgICAubWFwKHNuYXBzaG90ID0+ICh7IGtleTogYCR7dmFyaWFudC5pZH06JHtzbmFwc2hvdC53YXJlaG91c2VJZH1gLCBwcm9kdWN0LCB2YXJpYW50LCBzbmFwc2hvdCB9KSkpKTtcblxuICAgIHJldHVybiA8UGFuZWwgdGl0bGU9XCJMdeG7k25nIHTGsCB24bqlbiBiw6FuIGjDoG5nIMK3IGLhuqNuIHhlbSB0csaw4bubY1wiIHN1YnRpdGxlPVwiTeG6q3UgdMawxqFuZyB0w6FjIGPhu6VjIGLhu5k7IGtow7RuZyBn4buNaSBBSSB2w6Aga2jDtG5nIGfhu61pIHRpbiBjaG8ga2jDoWNoLlwiIGJlZm9yZUdhcD1cInN1cmZhY2VcIiBib2R5TW9kZT1cImluc2V0XCI+XG4gICAgICAgIDxTdXJmYWNlQ29udGVudCA+XG4gICAgICAgICAgICA8QWxlcnQgc2V2ZXJpdHk9XCJpbmZvXCI+TuG7mWkgZHVuZyBkxrDhu5tpIMSRw6J5IGNo4buJIG1pbmggaOG7jWEgZ2lhbyBkaeG7h24uIELhuqNuIGRlbW8ga2jDtG5nIHThu7EgdOG6oW8gY8OidSB0cuG6oyBs4budaSBBSSBob+G6t2MgbMawdSBr4buLY2ggYuG6o24gbMOqbiBtw6F5IGNo4bunLjwvQWxlcnQ+XG4gICAgICAgICAgICA8VGFicyB2YWx1ZT17dGFifSBvbkNoYW5nZT17KF8sIHZhbHVlOiBTYWxlc1ByZXZpZXdUYWIpID0+IHNldFRhYih2YWx1ZSl9IHZhcmlhbnQ9XCJzY3JvbGxhYmxlXCIgc2Nyb2xsQnV0dG9ucz1cImF1dG9cIiBhcmlhLWxhYmVsPVwiQ8OhYyBixrDhu5tjIHTGsCB24bqlbiBiw6FuIGjDoG5nIG3huqt1XCI+XG4gICAgICAgICAgICAgICAgPFRhYiB2YWx1ZT1cInNjcmlwdFwiIGxhYmVsPVwiS+G7i2NoIGLhuqNuXCIgLz5cbiAgICAgICAgICAgICAgICA8VGFiIHZhbHVlPVwic291cmNlc1wiIGxhYmVsPVwiR2nDoSAmIHThu5NuXCIgLz5cbiAgICAgICAgICAgICAgICA8VGFiIHZhbHVlPVwib3JkZXJcIiBsYWJlbD1cIlThuqFvIMSRxqFuXCIgLz5cbiAgICAgICAgICAgICAgICA8VGFiIHZhbHVlPVwiY29uZmlybWF0aW9uXCIgbGFiZWw9XCJYw6FjIG5o4bqtblwiIC8+XG4gICAgICAgICAgICA8L1RhYnM+XG4gICAgICAgICAgICB7dGFiID09PSAnc2NyaXB0JyAmJiA8U3VyZmFjZUNvbnRlbnQgIHJvbGU9XCJ0YWJwYW5lbFwiIGFyaWEtbGFiZWw9XCJL4buLY2ggYuG6o24gdMawIHbhuqVuIG3huqt1XCI+XG4gICAgICAgICAgICAgICAgPFRleHRGaWVsZCBzZWxlY3QgbGFiZWw9XCJOZ8OgbmggaMOgbmcgbeG6q3VcIiB2YWx1ZT17aW5kdXN0cnl9IG9uQ2hhbmdlPXtldmVudCA9PiBzZXRJbmR1c3RyeShldmVudC50YXJnZXQudmFsdWUgYXMga2V5b2YgdHlwZW9mIHNhbXBsZVNhbGVzU2NyaXB0cyl9PlxuICAgICAgICAgICAgICAgICAgICB7T2JqZWN0LmVudHJpZXMoc2FtcGxlU2FsZXNTY3JpcHRzKS5tYXAoKFtrZXksIHZhbHVlXSkgPT4gPE1lbnVJdGVtIGtleT17a2V5fSB2YWx1ZT17a2V5fT57dmFsdWUubGFiZWx9PC9NZW51SXRlbT4pfVxuICAgICAgICAgICAgICAgIDwvVGV4dEZpZWxkPlxuICAgICAgICAgICAgICAgIDxUeXBvZ3JhcGh5IGNvbXBvbmVudD1cImgzXCIgdmFyaWFudD1cInN1YnRpdGxlMlwiPkPDonUgaOG7j2kgZ+G7o2kgw708L1R5cG9ncmFwaHk+XG4gICAgICAgICAgICAgICAge3NjcmlwdC5xdWVzdGlvbnMubWFwKChxdWVzdGlvbiwgaW5kZXgpID0+IDxUeXBvZ3JhcGh5IGtleT17cXVlc3Rpb259IHZhcmlhbnQ9XCJib2R5MlwiPntpbmRleCArIDF9LiB7cXVlc3Rpb259PC9UeXBvZ3JhcGh5Pil9XG4gICAgICAgICAgICAgICAgPEFsZXJ0IHNldmVyaXR5PVwid2FybmluZ1wiPlJhbmggZ2nhu5tpIG3huqt1OiB7c2NyaXB0LmJvdW5kYXJ5fTwvQWxlcnQ+XG4gICAgICAgICAgICAgICAgPFR5cG9ncmFwaHkgdmFyaWFudD1cImNhcHRpb25cIiBjb2xvcj1cInRleHQuc2Vjb25kYXJ5XCI+QuG6o24gbmjDoXAgbeG6q3UgcmnDqm5nIHbhu5tpIGPhuqV1IGjDrG5oIGJvdCDEkWFuZyBkw7luZzsga2jDtG5nIGPDsyB0aGFvIHTDoWMgeHXhuqV0IGLhuqNuIOG7nyDEkcOieS48L1R5cG9ncmFwaHk+XG4gICAgICAgICAgICA8L1N1cmZhY2VDb250ZW50Pn1cbiAgICAgICAgICAgIHt0YWIgPT09ICdzb3VyY2VzJyAmJiA8U3VyZmFjZUNvbnRlbnQgIHJvbGU9XCJ0YWJwYW5lbFwiIGFyaWEtbGFiZWw9XCJOZ3Xhu5NuIGdpw6EgdsOgIHThu5NuIHRyb25nIGjhu5lwIHRoxrBcIj5cbiAgICAgICAgICAgICAgICA8QWxlcnQgc2V2ZXJpdHk9XCJpbmZvXCI+R2nDoSBs4bqleSB04burIGNhdGFsb2cgdsOgIHThu5NuIHThu6sgc25hcHNob3QgY8OzIHRo4budaSDEkWnhu4NtLiBE4buvIGxp4buHdSBjaOG7iSBsw6AgbW9jazsgY+G6p24gdHJ1eSB24bqlbiBs4bqhaSB0csaw4bubYyBraGkgeMOhYyBuaOG6rW4gxJHGoW4uPC9BbGVydD5cbiAgICAgICAgICAgICAgICB7IWNhblJlYWRDYXRhbG9nIHx8ICFjYW5SZWFkSW52ZW50b3J5XG4gICAgICAgICAgICAgICAgICAgID8gPEFsZXJ0IHNldmVyaXR5PVwid2FybmluZ1wiPkPhuqduIHF1eeG7gW4geGVtIHPhuqNuIHBo4bqpbSB2w6AgdOG7k24ga2hvIMSR4buDIMSR4buRaSBjaGnhur91IG5ndeG7k24uPC9BbGVydD5cbiAgICAgICAgICAgICAgICAgICAgOiA8UXVlcnlTdGF0ZSBxdWVyeT17cHJvZHVjdHN9IHBlbmRpbmdQcm9maWxlPVwic2VjdGlvblwiPntwcm9kdWN0cy5kYXRhICYmIDxRdWVyeVN0YXRlIHF1ZXJ5PXtzdG9ja30gcGVuZGluZ1Byb2ZpbGU9XCJzZWN0aW9uXCI+e3N0b2NrLmRhdGEgJiYgPD5cbiAgICAgICAgICAgICAgICAgICAgPERhdGFUYWJsZSBsYWJlbD1cIk5ndeG7k24gZ2nDoSB2w6AgdOG7k24gdHJvbmcgaOG7mXAgdGjGsFwiIHJvd3M9e3NvdXJjZVJvd3N9IHJvd0tleT17cm93ID0+IHJvdy5rZXl9IGVtcHR5PVwiQ2jGsGEgY8OzIHPhuqNuIHBo4bqpbSDEkeG7pyBk4buvIGxp4buHdSDEkeG7gyDEkeG7kWkgY2hp4bq/dS5cIiBjb2x1bW5zPXtbXG4gICAgICAgICAgICAgICAgICAgICAgICB7IGtleTogJ3Byb2R1Y3QnLCBsYWJlbDogJ1PhuqNuIHBo4bqpbScsIHJlbmRlcjogcm93ID0+IHJvdy5wcm9kdWN0Lm5hbWUgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHsga2V5OiAnc2t1JywgbGFiZWw6ICdTS1UnLCByZW5kZXI6IHJvdyA9PiByb3cudmFyaWFudC5za3UgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHsga2V5OiAncHJpY2UnLCBsYWJlbDogJ0dpw6EnLCBhbGlnbjogJ3JpZ2h0JywgcmVuZGVyOiByb3cgPT4gPEFtb3VudCB2YWx1ZT17cm93LnZhcmlhbnQucHJpY2V9IC8+IH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7IGtleTogJ2F2YWlsYWJsZScsIGxhYmVsOiAnQ8OzIHRo4buDIGLDoW4nLCBhbGlnbjogJ3JpZ2h0JywgcmVuZGVyOiByb3cgPT4gcm93LnNuYXBzaG90LmF2YWlsYWJsZSB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgeyBrZXk6ICdhc09mJywgbGFiZWw6ICdTbmFwc2hvdCBsw7pjJywgcmVuZGVyOiByb3cgPT4gZGF0ZVRpbWUocm93LnNuYXBzaG90LmFzT2YsIHNob3AudGltZXpvbmUpIH0sXG4gICAgICAgICAgICAgICAgICAgIF19IC8+XG4gICAgICAgICAgICAgICAgICAgIDxUeXBvZ3JhcGh5IHZhcmlhbnQ9XCJjYXB0aW9uXCIgY29sb3I9XCJ0ZXh0LnNlY29uZGFyeVwiPlByZXZpZXcgZ2nhu5tpIGjhuqFuIOG7nyAxMDAgc+G6o24gcGjhuqltIHbDoCAxMDAgc25hcHNob3QgxJHhuqd1IHRpw6puOyBraMO0bmcgcGjhuqNpIGRhbmggc8OhY2ggxJHhuqd5IMSR4bunLjwvVHlwb2dyYXBoeT5cbiAgICAgICAgICAgICAgICAgICAgPEFjdGlvbkdyb3VwIGRpcmVjdGlvbj1cInJvd1wiIGRlbnNpdHk9XCJjb21mb3J0YWJsZVwiPjxSb3V0ZUxpbmsgdG89e2Avcy8ke3Nob3AuaWR9L3Byb2R1Y3RzYH0+TeG7nyBkYW5oIHPDoWNoIHPhuqNuIHBo4bqpbTwvUm91dGVMaW5rPjxSb3V0ZUxpbmsgdG89e2Avcy8ke3Nob3AuaWR9L2ludmVudG9yeWB9Pk3hu58gZGFuaCBzw6FjaCB04buTbiBraG88L1JvdXRlTGluaz48L0FjdGlvbkdyb3VwPlxuICAgICAgICAgICAgICAgICAgICA8Lz59PC9RdWVyeVN0YXRlPn08L1F1ZXJ5U3RhdGU+fVxuICAgICAgICAgICAgPC9TdXJmYWNlQ29udGVudD59XG4gICAgICAgICAgICB7dGFiID09PSAnb3JkZXInICYmIDxTdXJmYWNlQ29udGVudCAgcm9sZT1cInRhYnBhbmVsXCIgYXJpYS1sYWJlbD1cIlThuqFvIMSRxqFuIHThu6sgaOG7mWkgdGhv4bqhaVwiPlxuICAgICAgICAgICAgICAgIDxUeXBvZ3JhcGh5IHZhcmlhbnQ9XCJib2R5MlwiPkNodXnhu4NuIHNhbmcgYmnhu4N1IG3huqt1IMSRxqFuIMSR4buDIG5ow6JuIHZpw6puIGtp4buDbSB0cmEga2jDoWNoLCBz4bqjbiBwaOG6qW0sIHPhu5EgbMaw4bujbmcgdsOgIGLDoW8gZ2nDoS48L1R5cG9ncmFwaHk+XG4gICAgICAgICAgICAgICAgPFJvdXRlTGluayB0bz17YC9zLyR7c2hvcC5pZH0vb3JkZXJzL25ldz9jdXN0b21lcklkPSR7Y3VzdG9tZXJJZH0mY29udmVyc2F0aW9uSWQ9JHtjb252ZXJzYXRpb25JZH1gfT5N4bufIGJp4buDdSBt4bqrdSB04bqhbyDEkcahbiB04burIGjhu5lpIHRob+G6oWk8L1JvdXRlTGluaz5cbiAgICAgICAgICAgICAgICA8QWxlcnQgc2V2ZXJpdHk9XCJpbmZvXCI+xJDGoW4gdHJvbmcgZGVtbyDEkcaw4bujYyBsxrB1IHbDoG8gTVNXIGPhu6VjIGLhu5kgY+G7p2EgdGFiOyDEkcOieSBraMO0bmcgcGjhuqNpIMSRxqFuIHRyw6puIG3DoXkgY2jhu6cuPC9BbGVydD5cbiAgICAgICAgICAgIDwvU3VyZmFjZUNvbnRlbnQ+fVxuICAgICAgICAgICAge3RhYiA9PT0gJ2NvbmZpcm1hdGlvbicgJiYgPFN1cmZhY2VDb250ZW50ICByb2xlPVwidGFicGFuZWxcIiBhcmlhLWxhYmVsPVwixJBp4buBdSBraeG7h24geMOhYyBuaOG6rW4gxJHGoW5cIj5cbiAgICAgICAgICAgICAgICA8QWxlcnQgc2V2ZXJpdHk9XCJ3YXJuaW5nXCI+S2jDtG5nIHThu7EgY2jhu5F0IMSRxqFuIHRyb25nIGdpYW8gZGnhu4duIG7DoHkuIELhurFuZyBjaOG7qW5nIHjDoWMgbmjhuq1uIGPhu6dhIGtow6FjaCwgYsOhbyBnacOhIGhp4buHbiBow6BuaCB2w6AgxJFp4buBdSBraeG7h24gZ2lhbyBuaOG6rW4gcGjhuqNpIMSRxrDhu6NjIGtp4buDbSB0cmEgdHLGsOG7m2Mga2hpIG5ow6JuIHZpw6puIHjDoWMgbmjhuq1uLjwvQWxlcnQ+XG4gICAgICAgICAgICAgICAgPEJ1dHRvbiB2YXJpYW50PVwib3V0bGluZWRcIiBkaXNhYmxlZD5U4buxIMSR4buZbmcgeMOhYyBuaOG6rW4gxJHGoW4gY2jGsGEgxJHGsOG7o2MgaOG7lyB0cuG7ozwvQnV0dG9uPlxuICAgICAgICAgICAgICAgIDxUeXBvZ3JhcGh5IHZhcmlhbnQ9XCJjYXB0aW9uXCIgY29sb3I9XCJ0ZXh0LnNlY29uZGFyeVwiPkPhuqduIGLhu5Ugc3VuZyBjYXBhYmlsaXR5IHbDoCBwb2xpY3kgdHJvbmcgY29udHJhY3QgdHLGsOG7m2Mga2hpIGLhuq10IHThu7EgxJHhu5luZyB4w6FjIG5o4bqtbi48L1R5cG9ncmFwaHk+XG4gICAgICAgICAgICA8L1N1cmZhY2VDb250ZW50Pn1cbiAgICAgICAgPC9TdXJmYWNlQ29udGVudD5cbiAgICA8L1BhbmVsPjtcbn1cblxuZnVuY3Rpb24gTW9ja1Vwc2VsbFByZXZpZXcoKSB7XG4gICAgY29uc3QgW29wZW4sIHNldE9wZW5dID0gdXNlU3RhdGUoZmFsc2UpO1xuICAgIHJldHVybiA8U3VyZmFjZUNvbnRlbnQgYmVmb3JlR2FwPVwic3VyZmFjZVwiPlxuICAgICAgICA8VHlwb2dyYXBoeSBjb21wb25lbnQ9XCJoM1wiIHZhcmlhbnQ9XCJzdWJ0aXRsZTJcIj5H4bujaSDDvSBiw6FuIGvDqG0gbeG6q3UgwrcgREVNTy1QUk9NTy0wMTwvVHlwb2dyYXBoeT5cbiAgICAgICAgPEFsZXJ0IHNldmVyaXR5PVwiaW5mb1wiPkNvbWJvIMOhbyB0aHVuICsgdMO6aSB0b3RlIGNo4buJIG1pbmggaOG7jWEgZ2lhbyBkaeG7h24uIEtow7RuZyBjw7MgQVBJIGtodXnhur9uIG3huqFpOyBnacOhLCBs4bujaSBuaHXhuq1uLCBTS1UgdsOgIHThu5NuIGtobyBjaMawYSDEkcaw4bujYyB4w6FjIHRo4buxYy48L0FsZXJ0PlxuICAgICAgICA8QnV0dG9uIHNpemU9XCJzbWFsbFwiIHZhcmlhbnQ9XCJvdXRsaW5lZFwiIG9uQ2xpY2s9eygpID0+IHNldE9wZW4odmFsdWUgPT4gIXZhbHVlKX0+e29wZW4gPyAn4bqobiDEkWnhu4F1IGtp4buHbiBt4bqrdScgOiAnWGVtIMSRaeG7gXUga2nhu4duIGNvbWJvIG3huqt1J308L0J1dHRvbj5cbiAgICAgICAge29wZW4gJiYgPFN0YWNrIHJvbGU9XCJzdGF0dXNcIiBkYXRhLXRlc3RpZD1cIm1vY2stcHJvbW90aW9uLXByZXZpZXdcIiBzeD17W2xheW91dFN4LnN1cmZhY2UuY29tcGFjdENvbnRlbnRHYXAsIGxheW91dFN4LnN1cmZhY2UuY29tcGFjdEluc2V0LCB7IGJvcmRlcjogMSwgYm9yZGVyQ29sb3I6ICdkaXZpZGVyJywgYm9yZGVyUmFkaXVzOiB2aXN1YWxTeC5yYWRpdXMuY29udHJvbCB9XX0+XG4gICAgICAgICAgICA8VHlwb2dyYXBoeSBjb21wb25lbnQ9XCJoM1wiIHZhcmlhbnQ9XCJzdWJ0aXRsZTJcIj5Db21ibyBt4bqrdSDCtyBERU1PLVBST01PLTAxPC9UeXBvZ3JhcGh5PlxuICAgICAgICAgICAgPFR5cG9ncmFwaHkgdmFyaWFudD1cImJvZHkyXCI+xJBp4buBdSBraeG7h24gbWluaCBo4buNYTogY8OzIMOtdCBuaOG6pXQgbeG7mXQgw6FvIHbDoCBt4buZdCBwaOG7pSBraeG7h24gdHJvbmcgxJHGoW4gbmjDoXAuPC9UeXBvZ3JhcGh5PlxuICAgICAgICAgICAgPFR5cG9ncmFwaHkgdmFyaWFudD1cImNhcHRpb25cIiBjb2xvcj1cInRleHQuc2Vjb25kYXJ5XCI+S2jDtG5nIMOhcCBk4bulbmcgZ2nhuqNtIGdpw6EsIGtow7RuZyBz4butYSDEkcahbiB2w6Aga2jDtG5nIGto4bqzbmcgxJHhu4tuaCDEkeG6oXQgYmnDqm4gbOG7o2kgbmh14bqtbi48L1R5cG9ncmFwaHk+XG4gICAgICAgIDwvU3RhY2s+fVxuICAgIDwvU3VyZmFjZUNvbnRlbnQ+O1xufVxuIl0sImZpbGUiOiJDOi9Vc2Vycy9Kb2tlci1QQy9Eb2N1bWVudHMvUHJvamVjdHMvQm90LUFJLUJhbi1oYW5nLUZCL0JvdFNhbGVzQUlfRnJvbnRlbmQvYXBwcy93ZWIvc3JjL21vZHVsZXMvaW5ib3gvaW5kZXgudHN4In0=