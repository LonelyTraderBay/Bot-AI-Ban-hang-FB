import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/modules/inbox/conversation-components.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-71740-905ecb82-e117-4987-abfc-1edc71e89605/deps/react_jsx-dev-runtime.js?v=6038fcaa"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$(), _s2 = $RefreshSig$();
import __vite__cjsImport3_react from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-71740-905ecb82-e117-4987-abfc-1edc71e89605/deps/react.js?v=6038fcaa"; const useRef = __vite__cjsImport3_react["useRef"]; const useState = __vite__cjsImport3_react["useState"];
import { visualSx } from "/src/shared/ui/visual.ts";
import { Alert, Box, Button, Chip, Divider, FormControlLabel, Checkbox, MenuItem, Stack, TextField, Typography } from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-71740-905ecb82-e117-4987-abfc-1edc71e89605/deps/@mui_material.js?v=58d20628";
import SendRounded from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-71740-905ecb82-e117-4987-abfc-1edc71e89605/deps/@mui_icons-material_SendRounded.js?v=fc6f4b89";
import { colors } from "/@fs/C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/packages/design-tokens/src/index.ts";
import { useApi, useCommand } from "/src/shared/api/hooks.ts";
import { useCan, useScope } from "/src/shared/model/scope.tsx";
import { limitCodePoints, dateTime } from "/src/shared/model/format.ts";
import { DetailLine, ErrorNotice, MutationButton, Panel, RouteLink, Status } from "/src/shared/ui/components.tsx";
import { layoutSx } from "/src/shared/ui/layout.ts";
export function ConversationComposer({
  conversation
}) {
  _s();
  const { session, online } = useScope();
  const canReply = useCan("conversations.reply");
  const send = useCommand("sendMessage", ["listMessages", "getConversation", "listConversations"]);
  const note = useCommand("addInternalNote", ["listMessages"]);
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);
  const revision = useRef(0);
  const currentConversation = useRef(conversation.id);
  currentConversation.current = conversation.id;
  const canSend = canReply && online && (internal || conversation.mode === "human" && conversation.assignedUserId === session.user.id && conversation.sendEligibility.state === "allowed");
  const submit = async () => {
    if (!canSend || !text.trim() || send.pending || note.pending || send.unresolved || note.unresolved) return;
    const submittedRevision = revision.current;
    const submittedConversation = conversation.id;
    try {
      if (internal) {
        await note.execute({ path: { conversationId: conversation.id }, body: { text: text.trim() } });
      } else {
        await send.execute({
          path: { conversationId: conversation.id },
          body: {
            clientMessageId: crypto.randomUUID(),
            text: text.trim(),
            expectedConversationVersion: conversation.version
          }
        });
      }
      if (revision.current === submittedRevision && currentConversation.current === submittedConversation) setText("");
    } catch {
    }
  };
  return /* @__PURE__ */ jsxDEV(
    Box,
    {
      component: "form",
      "data-draft-clean": text ? void 0 : "true",
      onSubmit: (event) => {
        event.preventDefault();
        void submit();
      },
      sx: [layoutSx.inbox.composerInset, { borderTop: 1, borderColor: "divider", minHeight: 0, overflowY: { xl: "auto" } }],
      children: [
        /* @__PURE__ */ jsxDEV(ErrorNotice, { error: send.error || note.error }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
          lineNumber: 84,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(
          FormControlLabel,
          {
            label: "Ghi chú nội bộ (không gửi khách)",
            control: /* @__PURE__ */ jsxDEV(Checkbox, { checked: internal, onChange: (event) => {
              revision.current += 1;
              setInternal(event.target.checked);
            }, disabled: !canReply }, void 0, false, {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
              lineNumber: 87,
              columnNumber: 18
            }, this)
          },
          void 0,
          false,
          {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
            lineNumber: 85,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          TextField,
          {
            fullWidth: true,
            multiline: true,
            minRows: 2,
            maxRows: 7,
            label: internal ? "Ghi chú cho nhóm" : "Nội dung trả lời khách",
            value: text,
            onChange: (event) => {
              revision.current += 1;
              setText(limitCodePoints(event.target.value, internal ? 1e4 : 2e4));
            },
            disabled: !canReply
          },
          void 0,
          false,
          {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
            lineNumber: 89,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(Stack, { direction: "row", alignItems: "center", justifyContent: "space-between", sx: [layoutSx.inbox.composerControlsBeforeGap, layoutSx.inbox.composerActionGap], children: [
          /* @__PURE__ */ jsxDEV(Typography, { variant: "caption", color: "text.secondary", children: !online ? "Đang ngoại tuyến" : !canSend ? "Cần tiếp quản hoặc quyền gửi hợp lệ" : "Tin gửi qua API, không dùng HTML từ AI" }, void 0, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
            lineNumber: 100,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV(
            Button,
            {
              type: "submit",
              variant: "contained",
              endIcon: /* @__PURE__ */ jsxDEV(SendRounded, {}, void 0, false, {
                fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
                lineNumber: 106,
                columnNumber: 20
              }, this),
              disabled: !canSend || !text.trim() || send.pending || note.pending || send.unresolved || note.unresolved,
              children: internal ? "Lưu ghi chú" : "Gửi trả lời"
            },
            void 0,
            false,
            {
              fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
              lineNumber: 103,
              columnNumber: 17
            },
            this
          )
        ] }, void 0, true, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
          lineNumber: 99,
          columnNumber: 13
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
      lineNumber: 75,
      columnNumber: 5
    },
    this
  );
}
_s(ConversationComposer, "CFTcdfV1ZPwRFnWDXoM8pTqhDoc=", false, function() {
  return [useScope, useCan, useCommand, useCommand];
});
_c = ConversationComposer;
export function ConversationMessageList({
  messages,
  timezone,
  onRate
}) {
  return messages.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((message) => {
    const senderLabel = message.direction === "internal" ? "Ghi chú nội bộ" : message.senderKind === "customer" ? "Khách" : message.senderKind === "bot" ? "Trợ lý AI" : "Nhân viên";
    const messageText = message.text.replace(/\s+/g, " ").trim();
    const preview = Array.from(messageText).slice(0, 64).join("");
    const messagePreview = preview === messageText ? messageText : `${preview.trimEnd()}…`;
    return /* @__PURE__ */ jsxDEV(Stack, { alignItems: message.direction === "inbound" ? "flex-start" : "flex-end", children: /* @__PURE__ */ jsxDEV(Box, { "data-testid": "inbox-message-bubble", sx: [layoutSx.inbox.bubbleInset, {
      maxWidth: "88%",
      borderRadius: visualSx.radius.bubble,
      bgcolor: message.direction === "internal" ? colors.selected : message.direction === "inbound" ? colors.surface : colors.raised,
      border: message.direction === "internal" ? "1px solid" : "none",
      borderColor: colors.heroBorder
    }], children: /* @__PURE__ */ jsxDEV(Stack, { "data-testid": "inbox-message-meta-flow", sx: layoutSx.inbox.messageMetaGap, children: [
      /* @__PURE__ */ jsxDEV(Stack, { "data-testid": "inbox-message-content-flow", sx: layoutSx.inbox.messageContentGap, children: [
        /* @__PURE__ */ jsxDEV(Typography, { variant: "caption", color: "text.secondary", children: senderLabel }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
          lineNumber: 137,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV(Typography, { sx: { whiteSpace: "pre-wrap", overflowWrap: "anywhere" }, children: message.text }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
          lineNumber: 140,
          columnNumber: 25
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
        lineNumber: 136,
        columnNumber: 21
      }, this),
      message.sourceEvidence.length > 0 && /* @__PURE__ */ jsxDEV(Stack, { direction: "row", sx: [layoutSx.surface.compactContentGap, { flexWrap: "wrap" }], "aria-label": "Nguồn tham chiếu", children: message.sourceEvidence.map(
        (reference, index) => /* @__PURE__ */ jsxDEV(Chip, { size: "small", variant: "outlined", label: `${reference.type} · ${reference.id}` }, `${reference.type}:${reference.id}:${index}`, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
          lineNumber: 145,
          columnNumber: 13
        }, this)
      ) }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
        lineNumber: 143,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(Stack, { direction: "row", alignItems: "center", sx: [layoutSx.inbox.composerActionGap, { flexWrap: "wrap" }], children: [
        /* @__PURE__ */ jsxDEV(Typography, { variant: "caption", color: "text.secondary", children: [
          dateTime(message.createdAt, timezone),
          " · ",
          message.status
        ] }, void 0, true, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
          lineNumber: 150,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ jsxDEV(
          Button,
          {
            size: "small",
            "aria-label": `Đánh giá tin nhắn của ${senderLabel} lúc ${dateTime(message.createdAt, timezone)}: ${messagePreview}`,
            onClick: () => onRate(message),
            children: "Đánh giá"
          },
          void 0,
          false,
          {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
            lineNumber: 151,
            columnNumber: 25
          },
          this
        )
      ] }, void 0, true, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
        lineNumber: 149,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
      lineNumber: 135,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
      lineNumber: 128,
      columnNumber: 13
    }, this) }, message.id, false, {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
      lineNumber: 127,
      columnNumber: 12
    }, this);
  });
}
_c2 = ConversationMessageList;
export function ConversationContextPanel({
  conversation,
  children
}) {
  _s2();
  const { shop } = useScope();
  const canReadCustomers = useCan("customers.read");
  const canCreateOrders = useCan("orders.write");
  const metadata = useApi("getInboxMetadata");
  const assign = useCommand("assignConversation", ["getConversation", "listConversations"]);
  const [assignee, setAssignee] = useState("");
  return /* @__PURE__ */ jsxDEV(
    Box,
    {
      "data-testid": "inbox-context-panel",
      component: "aside",
      "aria-label": "Bối cảnh khách hàng",
      tabIndex: 0,
      sx: { minWidth: 0, minHeight: 0, maxHeight: { xl: 650 }, overflowY: { xl: "auto" } },
      children: /* @__PURE__ */ jsxDEV(Panel, { title: "Bối cảnh khách hàng", children: /* @__PURE__ */ jsxDEV(Box, { "data-testid": "inbox-context-content", sx: layoutSx.inbox.contextInset, children: [
        /* @__PURE__ */ jsxDEV(DetailLine, { label: "Trạng thái", children: /* @__PURE__ */ jsxDEV(Status, { value: conversation.status }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
          lineNumber: 186,
          columnNumber: 52
        }, this) }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
          lineNumber: 186,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV(DetailLine, { label: "Kênh", children: metadata.data?.data.channels.find((channel) => channel.id === conversation.channelId)?.displayName || conversation.channelId }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
          lineNumber: 187,
          columnNumber: 21
        }, this),
        canReadCustomers ? /* @__PURE__ */ jsxDEV(RouteLink, { to: `/s/${shop.id}/customers/${conversation.customerId}`, children: "Hồ sơ khách" }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
          lineNumber: 191,
          columnNumber: 11
        }, this) : /* @__PURE__ */ jsxDEV(Typography, { variant: "caption", color: "text.secondary", children: "Thông tin khách bị ẩn theo quyền hiện tại." }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
          lineNumber: 192,
          columnNumber: 11
        }, this),
        canCreateOrders && /* @__PURE__ */ jsxDEV(RouteLink, { to: `/s/${shop.id}/orders/new?customerId=${conversation.customerId}&conversationId=${conversation.id}`, children: "Tạo đơn từ hội thoại" }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
          lineNumber: 194,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(Divider, { sx: [layoutSx.surface.sectionBefore, layoutSx.notice.afterGap] }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
          lineNumber: 198,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV(TextField, { label: "Giao cho nhân viên", select: true, fullWidth: true, size: "small", value: assignee, onChange: (event) => setAssignee(event.target.value), children: [
          /* @__PURE__ */ jsxDEV(MenuItem, { value: "", children: "Chọn nhân viên" }, void 0, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
            lineNumber: 200,
            columnNumber: 25
          }, this),
          metadata.data?.data.assignees.map((user) => /* @__PURE__ */ jsxDEV(MenuItem, { value: user.userId, children: user.displayName }, user.userId, false, {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
            lineNumber: 201,
            columnNumber: 70
          }, this))
        ] }, void 0, true, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
          lineNumber: 199,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV(
          MutationButton,
          {
            permission: "conversations.assign",
            disabled: !assignee,
            busy: assign.pending,
            onClick: () => {
              void assign.execute({
                path: { conversationId: conversation.id },
                body: { userId: assignee, expectedVersion: conversation.version }
              }).catch(() => void 0);
            },
            children: "Phân công"
          },
          void 0,
          false,
          {
            fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
            lineNumber: 203,
            columnNumber: 21
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(ErrorNotice, { error: assign.error }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
          lineNumber: 216,
          columnNumber: 21
        }, this),
        /* @__PURE__ */ jsxDEV(Alert, { severity: "info", sx: layoutSx.surface.sectionBefore, children: "Ảnh/tin thoại chỉ bật khi hợp đồng kênh xác nhận hỗ trợ. Phiên bản API hiện tại của ô soạn chỉ gửi văn bản." }, void 0, false, {
          fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
          lineNumber: 217,
          columnNumber: 21
        }, this),
        children
      ] }, void 0, true, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
        lineNumber: 185,
        columnNumber: 17
      }, this) }, void 0, false, {
        fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
        lineNumber: 184,
        columnNumber: 13
      }, this)
    },
    void 0,
    false,
    {
      fileName: "C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx",
      lineNumber: 177,
      columnNumber: 5
    },
    this
  );
}
_s2(ConversationContextPanel, "GH5HIk+MXRQRHBiYM6/OhvXx8Uk=", false, function() {
  return [useScope, useCan, useCan, useApi, useCommand];
});
_c3 = ConversationContextPanel;
var _c, _c2, _c3;
$RefreshReg$(_c, "ConversationComposer");
$RefreshReg$(_c2, "ConversationMessageList");
$RefreshReg$(_c3, "ConversationContextPanel");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/apps/web/src/modules/inbox/conversation-components.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQVlBO0FBQUEsUUFDQSx1QkFBQyxlQUFZLE9BQU9zRSxPQUFPNUQsU0FBM0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFpQztBQUFBLFFBQ2pDLHVCQUFDLFNBQU0sVUFBUyxRQUFPLElBQUloRCxTQUFTb0YsUUFBUXFDLGVBQWMsMkhBQTFEO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFFQTtBQUFBLFFBQ0NuQjtBQUFBQSxXQW5DTDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBb0NBLEtBckNKO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFzQ0E7QUFBQTtBQUFBLElBN0NKO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQThDQTtBQUVSO0FBQUNDLElBNURlRiwwQkFBd0I7QUFBQSxVQUluQjlHLFVBQ1FELFFBQ0RBLFFBQ1BGLFFBQ0ZDLFVBQVU7QUFBQTtBQUFBLE1BUmJnSDtBQUF3QixJQUFBMkIsSUFBQTVCLEtBQUE2QjtBQUFBLGFBQUFELElBQUE7QUFBQSxhQUFBNUIsS0FBQTtBQUFBLGFBQUE2QixLQUFBIiwibmFtZXMiOlsidXNlUmVmIiwidXNlU3RhdGUiLCJ2aXN1YWxTeCIsIkFsZXJ0IiwiQm94IiwiQnV0dG9uIiwiQ2hpcCIsIkRpdmlkZXIiLCJGb3JtQ29udHJvbExhYmVsIiwiQ2hlY2tib3giLCJNZW51SXRlbSIsIlN0YWNrIiwiVGV4dEZpZWxkIiwiVHlwb2dyYXBoeSIsIlNlbmRSb3VuZGVkIiwiY29sb3JzIiwidXNlQXBpIiwidXNlQ29tbWFuZCIsInVzZUNhbiIsInVzZVNjb3BlIiwibGltaXRDb2RlUG9pbnRzIiwiZGF0ZVRpbWUiLCJEZXRhaWxMaW5lIiwiRXJyb3JOb3RpY2UiLCJNdXRhdGlvbkJ1dHRvbiIsIlBhbmVsIiwiUm91dGVMaW5rIiwiU3RhdHVzIiwibGF5b3V0U3giLCJDb252ZXJzYXRpb25Db21wb3NlciIsImNvbnZlcnNhdGlvbiIsIl9zIiwic2Vzc2lvbiIsIm9ubGluZSIsImNhblJlcGx5Iiwic2VuZCIsIm5vdGUiLCJ0ZXh0Iiwic2V0VGV4dCIsImludGVybmFsIiwic2V0SW50ZXJuYWwiLCJyZXZpc2lvbiIsImN1cnJlbnRDb252ZXJzYXRpb24iLCJpZCIsImN1cnJlbnQiLCJjYW5TZW5kIiwibW9kZSIsImFzc2lnbmVkVXNlcklkIiwidXNlciIsInNlbmRFbGlnaWJpbGl0eSIsInN0YXRlIiwic3VibWl0IiwidHJpbSIsInBlbmRpbmciLCJ1bnJlc29sdmVkIiwic3VibWl0dGVkUmV2aXNpb24iLCJzdWJtaXR0ZWRDb252ZXJzYXRpb24iLCJleGVjdXRlIiwicGF0aCIsImNvbnZlcnNhdGlvbklkIiwiYm9keSIsImNsaWVudE1lc3NhZ2VJZCIsImNyeXB0byIsInJhbmRvbVVVSUQiLCJleHBlY3RlZENvbnZlcnNhdGlvblZlcnNpb24iLCJ2ZXJzaW9uIiwidW5kZWZpbmVkIiwiZXZlbnQiLCJwcmV2ZW50RGVmYXVsdCIsImluYm94IiwiY29tcG9zZXJJbnNldCIsImJvcmRlclRvcCIsImJvcmRlckNvbG9yIiwibWluSGVpZ2h0Iiwib3ZlcmZsb3dZIiwieGwiLCJlcnJvciIsInRhcmdldCIsImNoZWNrZWQiLCJ2YWx1ZSIsImNvbXBvc2VyQ29udHJvbHNCZWZvcmVHYXAiLCJjb21wb3NlckFjdGlvbkdhcCIsIkNvbnZlcnNhdGlvbk1lc3NhZ2VMaXN0IiwibWVzc2FnZXMiLCJ0aW1lem9uZSIsIm9uUmF0ZSIsInNsaWNlIiwic29ydCIsImEiLCJiIiwiY3JlYXRlZEF0IiwibG9jYWxlQ29tcGFyZSIsIm1hcCIsIm1lc3NhZ2UiLCJzZW5kZXJMYWJlbCIsImRpcmVjdGlvbiIsInNlbmRlcktpbmQiLCJtZXNzYWdlVGV4dCIsInJlcGxhY2UiLCJwcmV2aWV3IiwiQXJyYXkiLCJmcm9tIiwiam9pbiIsIm1lc3NhZ2VQcmV2aWV3IiwidHJpbUVuZCIsImJ1YmJsZUluc2V0IiwibWF4V2lkdGgiLCJib3JkZXJSYWRpdXMiLCJyYWRpdXMiLCJidWJibGUiLCJiZ2NvbG9yIiwic2VsZWN0ZWQiLCJzdXJmYWNlIiwicmFpc2VkIiwiYm9yZGVyIiwiaGVyb0JvcmRlciIsIm1lc3NhZ2VNZXRhR2FwIiwibWVzc2FnZUNvbnRlbnRHYXAiLCJ3aGl0ZVNwYWNlIiwib3ZlcmZsb3dXcmFwIiwic291cmNlRXZpZGVuY2UiLCJsZW5ndGgiLCJjb21wYWN0Q29udGVudEdhcCIsImZsZXhXcmFwIiwicmVmZXJlbmNlIiwiaW5kZXgiLCJ0eXBlIiwic3RhdHVzIiwiX2MyIiwiQ29udmVyc2F0aW9uQ29udGV4dFBhbmVsIiwiY2hpbGRyZW4iLCJfczIiLCJzaG9wIiwiY2FuUmVhZEN1c3RvbWVycyIsImNhbkNyZWF0ZU9yZGVycyIsIm1ldGFkYXRhIiwiYXNzaWduIiwiYXNzaWduZWUiLCJzZXRBc3NpZ25lZSIsIm1pbldpZHRoIiwibWF4SGVpZ2h0IiwiY29udGV4dEluc2V0IiwiZGF0YSIsImNoYW5uZWxzIiwiZmluZCIsImNoYW5uZWwiLCJjaGFubmVsSWQiLCJkaXNwbGF5TmFtZSIsImN1c3RvbWVySWQiLCJzZWN0aW9uQmVmb3JlIiwibm90aWNlIiwiYWZ0ZXJHYXAiLCJhc3NpZ25lZXMiLCJ1c2VySWQiLCJleHBlY3RlZFZlcnNpb24iLCJjYXRjaCIsIl9jIiwiX2MzIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbImNvbnZlcnNhdGlvbi1jb21wb25lbnRzLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VSZWYsIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgdmlzdWFsU3ggfSBmcm9tICdAL3NoYXJlZC91aS92aXN1YWwnO1xuaW1wb3J0IHR5cGUgeyBSZWFjdE5vZGUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBBbGVydCwgQm94LCBCdXR0b24sIENoaXAsIERpdmlkZXIsIEZvcm1Db250cm9sTGFiZWwsIENoZWNrYm94LCBNZW51SXRlbSwgU3RhY2ssIFRleHRGaWVsZCwgVHlwb2dyYXBoeSB9IGZyb20gJ0BtdWkvbWF0ZXJpYWwnO1xuaW1wb3J0IFNlbmRSb3VuZGVkIGZyb20gJ0BtdWkvaWNvbnMtbWF0ZXJpYWwvU2VuZFJvdW5kZWQnO1xuaW1wb3J0IHR5cGUgeyBDb252ZXJzYXRpb24sIE1lc3NhZ2UgfSBmcm9tICdAYm90c2FsZXMvY29udHJhY3RzJztcbmltcG9ydCB7IGNvbG9ycyB9IGZyb20gJ0Bib3RzYWxlcy90b2tlbnMnO1xuaW1wb3J0IHsgdXNlQXBpLCB1c2VDb21tYW5kIH0gZnJvbSAnQC9zaGFyZWQvYXBpL2hvb2tzJztcbmltcG9ydCB7IHVzZUNhbiwgdXNlU2NvcGUgfSBmcm9tICdAL3NoYXJlZC9tb2RlbC9zY29wZSc7XG5pbXBvcnQgeyBsaW1pdENvZGVQb2ludHMsIGRhdGVUaW1lIH0gZnJvbSAnQC9zaGFyZWQvbW9kZWwvZm9ybWF0JztcbmltcG9ydCB7IERldGFpbExpbmUsIEVycm9yTm90aWNlLCBNdXRhdGlvbkJ1dHRvbiwgUGFuZWwsIFJvdXRlTGluaywgU3RhdHVzIH0gZnJvbSAnQC9zaGFyZWQvdWkvY29tcG9uZW50cyc7XG5pbXBvcnQgeyBsYXlvdXRTeCB9IGZyb20gJ0Avc2hhcmVkL3VpL2xheW91dCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBDb252ZXJzYXRpb25Db21wb3Nlcih7IGNvbnZlcnNhdGlvbiB9OiB7XG4gICAgY29udmVyc2F0aW9uOiBDb252ZXJzYXRpb247XG59KSB7XG4gICAgY29uc3QgeyBzZXNzaW9uLCBvbmxpbmUgfSA9IHVzZVNjb3BlKCk7XG4gICAgY29uc3QgY2FuUmVwbHkgPSB1c2VDYW4oJ2NvbnZlcnNhdGlvbnMucmVwbHknKTtcbiAgICBjb25zdCBzZW5kID0gdXNlQ29tbWFuZCgnc2VuZE1lc3NhZ2UnLCBbJ2xpc3RNZXNzYWdlcycsICdnZXRDb252ZXJzYXRpb24nLCAnbGlzdENvbnZlcnNhdGlvbnMnXSk7XG4gICAgY29uc3Qgbm90ZSA9IHVzZUNvbW1hbmQoJ2FkZEludGVybmFsTm90ZScsIFsnbGlzdE1lc3NhZ2VzJ10pO1xuICAgIGNvbnN0IFt0ZXh0LCBzZXRUZXh0XSA9IHVzZVN0YXRlKCcnKTtcbiAgICBjb25zdCBbaW50ZXJuYWwsIHNldEludGVybmFsXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgICBjb25zdCByZXZpc2lvbiA9IHVzZVJlZigwKTtcbiAgICBjb25zdCBjdXJyZW50Q29udmVyc2F0aW9uID0gdXNlUmVmKGNvbnZlcnNhdGlvbi5pZCk7XG4gICAgY3VycmVudENvbnZlcnNhdGlvbi5jdXJyZW50ID0gY29udmVyc2F0aW9uLmlkO1xuICAgIGNvbnN0IGNhblNlbmQgPSBjYW5SZXBseSAmJiBvbmxpbmUgJiYgKGludGVybmFsIHx8IChcbiAgICAgICAgY29udmVyc2F0aW9uLm1vZGUgPT09ICdodW1hbicgJiZcbiAgICAgICAgY29udmVyc2F0aW9uLmFzc2lnbmVkVXNlcklkID09PSBzZXNzaW9uLnVzZXIuaWQgJiZcbiAgICAgICAgY29udmVyc2F0aW9uLnNlbmRFbGlnaWJpbGl0eS5zdGF0ZSA9PT0gJ2FsbG93ZWQnXG4gICAgKSk7XG5cbiAgICBjb25zdCBzdWJtaXQgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgIGlmICghY2FuU2VuZCB8fCAhdGV4dC50cmltKCkgfHwgc2VuZC5wZW5kaW5nIHx8IG5vdGUucGVuZGluZyB8fCBzZW5kLnVucmVzb2x2ZWQgfHwgbm90ZS51bnJlc29sdmVkKSByZXR1cm47XG4gICAgICAgIGNvbnN0IHN1Ym1pdHRlZFJldmlzaW9uID0gcmV2aXNpb24uY3VycmVudDtcbiAgICAgICAgY29uc3Qgc3VibWl0dGVkQ29udmVyc2F0aW9uID0gY29udmVyc2F0aW9uLmlkO1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKGludGVybmFsKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgbm90ZS5leGVjdXRlKHsgcGF0aDogeyBjb252ZXJzYXRpb25JZDogY29udmVyc2F0aW9uLmlkIH0sIGJvZHk6IHsgdGV4dDogdGV4dC50cmltKCkgfSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgc2VuZC5leGVjdXRlKHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogeyBjb252ZXJzYXRpb25JZDogY29udmVyc2F0aW9uLmlkIH0sXG4gICAgICAgICAgICAgICAgICAgIGJvZHk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudE1lc3NhZ2VJZDogY3J5cHRvLnJhbmRvbVVVSUQoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IHRleHQudHJpbSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWRDb252ZXJzYXRpb25WZXJzaW9uOiBjb252ZXJzYXRpb24udmVyc2lvbixcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZXZpc2lvbi5jdXJyZW50ID09PSBzdWJtaXR0ZWRSZXZpc2lvbiAmJiBjdXJyZW50Q29udmVyc2F0aW9uLmN1cnJlbnQgPT09IHN1Ym1pdHRlZENvbnZlcnNhdGlvbikgc2V0VGV4dCgnJyk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgLy8gVW5rbm93biBzZW5kcyBwcmVzZXJ2ZSB0ZXh0IGFuZCBkaXNhYmxlIHJldHJpZXMgaW4gdGhlIGNvbW1hbmQgaG9vay5cbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gKFxuICAgICAgICA8Qm94XG4gICAgICAgICAgICBjb21wb25lbnQ9XCJmb3JtXCJcbiAgICAgICAgICAgIGRhdGEtZHJhZnQtY2xlYW49e3RleHQgPyB1bmRlZmluZWQgOiAndHJ1ZSd9XG4gICAgICAgICAgICBvblN1Ym1pdD17ZXZlbnQgPT4ge1xuICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdm9pZCBzdWJtaXQoKTtcbiAgICAgICAgICAgIH19XG4gICAgICAgICAgICBzeD17W2xheW91dFN4LmluYm94LmNvbXBvc2VySW5zZXQsIHsgYm9yZGVyVG9wOiAxLCBib3JkZXJDb2xvcjogJ2RpdmlkZXInLCBtaW5IZWlnaHQ6IDAsIG92ZXJmbG93WTogeyB4bDogJ2F1dG8nIH0gfV19XG4gICAgICAgID5cbiAgICAgICAgICAgIDxFcnJvck5vdGljZSBlcnJvcj17c2VuZC5lcnJvciB8fCBub3RlLmVycm9yfSAvPlxuICAgICAgICAgICAgPEZvcm1Db250cm9sTGFiZWxcbiAgICAgICAgICAgICAgICBsYWJlbD1cIkdoaSBjaMO6IG7hu5lpIGLhu5kgKGtow7RuZyBn4butaSBraMOhY2gpXCJcbiAgICAgICAgICAgICAgICBjb250cm9sPXs8Q2hlY2tib3ggY2hlY2tlZD17aW50ZXJuYWx9IG9uQ2hhbmdlPXtldmVudCA9PiB7IHJldmlzaW9uLmN1cnJlbnQgKz0gMTsgc2V0SW50ZXJuYWwoZXZlbnQudGFyZ2V0LmNoZWNrZWQpOyB9fSBkaXNhYmxlZD17IWNhblJlcGx5fSAvPn1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8VGV4dEZpZWxkXG4gICAgICAgICAgICAgICAgZnVsbFdpZHRoXG4gICAgICAgICAgICAgICAgbXVsdGlsaW5lXG4gICAgICAgICAgICAgICAgbWluUm93cz17Mn1cbiAgICAgICAgICAgICAgICBtYXhSb3dzPXs3fVxuICAgICAgICAgICAgICAgIGxhYmVsPXtpbnRlcm5hbCA/ICdHaGkgY2jDuiBjaG8gbmjDs20nIDogJ07hu5lpIGR1bmcgdHLhuqMgbOG7nWkga2jDoWNoJ31cbiAgICAgICAgICAgICAgICB2YWx1ZT17dGV4dH1cbiAgICAgICAgICAgICAgICBvbkNoYW5nZT17ZXZlbnQgPT4geyByZXZpc2lvbi5jdXJyZW50ICs9IDE7IHNldFRleHQobGltaXRDb2RlUG9pbnRzKGV2ZW50LnRhcmdldC52YWx1ZSwgaW50ZXJuYWwgPyAxMDAwMCA6IDIwMDAwKSk7IH19XG4gICAgICAgICAgICAgICAgZGlzYWJsZWQ9eyFjYW5SZXBseX1cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8U3RhY2sgZGlyZWN0aW9uPVwicm93XCIgYWxpZ25JdGVtcz1cImNlbnRlclwiIGp1c3RpZnlDb250ZW50PVwic3BhY2UtYmV0d2VlblwiIHN4PXtbbGF5b3V0U3guaW5ib3guY29tcG9zZXJDb250cm9sc0JlZm9yZUdhcCwgbGF5b3V0U3guaW5ib3guY29tcG9zZXJBY3Rpb25HYXBdfT5cbiAgICAgICAgICAgICAgICA8VHlwb2dyYXBoeSB2YXJpYW50PVwiY2FwdGlvblwiIGNvbG9yPVwidGV4dC5zZWNvbmRhcnlcIj5cbiAgICAgICAgICAgICAgICAgICAgeyFvbmxpbmUgPyAnxJBhbmcgbmdv4bqhaSB0dXnhur9uJyA6ICFjYW5TZW5kID8gJ0PhuqduIHRp4bq/cCBxdeG6o24gaG/hurdjIHF1eeG7gW4gZ+G7rWkgaOG7o3AgbOG7hycgOiAnVGluIGfhu61pIHF1YSBBUEksIGtow7RuZyBkw7luZyBIVE1MIHThu6sgQUknfVxuICAgICAgICAgICAgICAgIDwvVHlwb2dyYXBoeT5cbiAgICAgICAgICAgICAgICA8QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJzdWJtaXRcIlxuICAgICAgICAgICAgICAgICAgICB2YXJpYW50PVwiY29udGFpbmVkXCJcbiAgICAgICAgICAgICAgICAgICAgZW5kSWNvbj17PFNlbmRSb3VuZGVkIC8+fVxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17IWNhblNlbmQgfHwgIXRleHQudHJpbSgpIHx8IHNlbmQucGVuZGluZyB8fCBub3RlLnBlbmRpbmcgfHwgc2VuZC51bnJlc29sdmVkIHx8IG5vdGUudW5yZXNvbHZlZH1cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIHtpbnRlcm5hbCA/ICdMxrB1IGdoaSBjaMO6JyA6ICdH4butaSB0cuG6oyBs4budaSd9XG4gICAgICAgICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgICA8L1N0YWNrPlxuICAgICAgICA8L0JveD5cbiAgICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gQ29udmVyc2F0aW9uTWVzc2FnZUxpc3QoeyBtZXNzYWdlcywgdGltZXpvbmUsIG9uUmF0ZSB9OiB7XG4gICAgbWVzc2FnZXM6IE1lc3NhZ2VbXTtcbiAgICB0aW1lem9uZTogc3RyaW5nO1xuICAgIG9uUmF0ZTogKG1lc3NhZ2U6IE1lc3NhZ2UpID0+IHZvaWQ7XG59KSB7XG4gICAgcmV0dXJuIG1lc3NhZ2VzLnNsaWNlKCkuc29ydCgoYSwgYikgPT4gYS5jcmVhdGVkQXQubG9jYWxlQ29tcGFyZShiLmNyZWF0ZWRBdCkpLm1hcChtZXNzYWdlID0+IHtcbiAgICAgICAgY29uc3Qgc2VuZGVyTGFiZWwgPSBtZXNzYWdlLmRpcmVjdGlvbiA9PT0gJ2ludGVybmFsJyA/ICdHaGkgY2jDuiBu4buZaSBi4buZJyA6IG1lc3NhZ2Uuc2VuZGVyS2luZCA9PT0gJ2N1c3RvbWVyJyA/ICdLaMOhY2gnIDogbWVzc2FnZS5zZW5kZXJLaW5kID09PSAnYm90JyA/ICdUcuG7oyBsw70gQUknIDogJ05ow6JuIHZpw6puJztcbiAgICAgICAgY29uc3QgbWVzc2FnZVRleHQgPSBtZXNzYWdlLnRleHQucmVwbGFjZSgvXFxzKy9nLCAnICcpLnRyaW0oKTtcbiAgICAgICAgY29uc3QgcHJldmlldyA9IEFycmF5LmZyb20obWVzc2FnZVRleHQpLnNsaWNlKDAsIDY0KS5qb2luKCcnKTtcbiAgICAgICAgY29uc3QgbWVzc2FnZVByZXZpZXcgPSBwcmV2aWV3ID09PSBtZXNzYWdlVGV4dCA/IG1lc3NhZ2VUZXh0IDogYCR7cHJldmlldy50cmltRW5kKCl94oCmYDtcblxuICAgICAgICByZXR1cm4gPFN0YWNrIGtleT17bWVzc2FnZS5pZH0gYWxpZ25JdGVtcz17bWVzc2FnZS5kaXJlY3Rpb24gPT09ICdpbmJvdW5kJyA/ICdmbGV4LXN0YXJ0JyA6ICdmbGV4LWVuZCd9PlxuICAgICAgICAgICAgPEJveCBkYXRhLXRlc3RpZD1cImluYm94LW1lc3NhZ2UtYnViYmxlXCIgc3g9e1tsYXlvdXRTeC5pbmJveC5idWJibGVJbnNldCwge1xuICAgICAgICAgICAgICAgIG1heFdpZHRoOiAnODglJyxcbiAgICAgICAgICAgICAgICBib3JkZXJSYWRpdXM6IHZpc3VhbFN4LnJhZGl1cy5idWJibGUsXG4gICAgICAgICAgICAgICAgYmdjb2xvcjogbWVzc2FnZS5kaXJlY3Rpb24gPT09ICdpbnRlcm5hbCcgPyBjb2xvcnMuc2VsZWN0ZWQgOiBtZXNzYWdlLmRpcmVjdGlvbiA9PT0gJ2luYm91bmQnID8gY29sb3JzLnN1cmZhY2UgOiBjb2xvcnMucmFpc2VkLFxuICAgICAgICAgICAgICAgIGJvcmRlcjogbWVzc2FnZS5kaXJlY3Rpb24gPT09ICdpbnRlcm5hbCcgPyAnMXB4IHNvbGlkJyA6ICdub25lJyxcbiAgICAgICAgICAgICAgICBib3JkZXJDb2xvcjogY29sb3JzLmhlcm9Cb3JkZXIsXG4gICAgICAgICAgICB9XX0+XG4gICAgICAgICAgICAgICAgPFN0YWNrIGRhdGEtdGVzdGlkPVwiaW5ib3gtbWVzc2FnZS1tZXRhLWZsb3dcIiBzeD17bGF5b3V0U3guaW5ib3gubWVzc2FnZU1ldGFHYXB9PlxuICAgICAgICAgICAgICAgICAgICA8U3RhY2sgZGF0YS10ZXN0aWQ9XCJpbmJveC1tZXNzYWdlLWNvbnRlbnQtZmxvd1wiIHN4PXtsYXlvdXRTeC5pbmJveC5tZXNzYWdlQ29udGVudEdhcH0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8VHlwb2dyYXBoeSB2YXJpYW50PVwiY2FwdGlvblwiIGNvbG9yPVwidGV4dC5zZWNvbmRhcnlcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7c2VuZGVyTGFiZWx9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L1R5cG9ncmFwaHk+XG4gICAgICAgICAgICAgICAgICAgICAgICA8VHlwb2dyYXBoeSBzeD17eyB3aGl0ZVNwYWNlOiAncHJlLXdyYXAnLCBvdmVyZmxvd1dyYXA6ICdhbnl3aGVyZScgfX0+e21lc3NhZ2UudGV4dH08L1R5cG9ncmFwaHk+XG4gICAgICAgICAgICAgICAgICAgIDwvU3RhY2s+XG4gICAgICAgICAgICAgICAgICAgIHttZXNzYWdlLnNvdXJjZUV2aWRlbmNlLmxlbmd0aCA+IDAgJiYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgPFN0YWNrIGRpcmVjdGlvbj1cInJvd1wiIHN4PXtbbGF5b3V0U3guc3VyZmFjZS5jb21wYWN0Q29udGVudEdhcCwgeyBmbGV4V3JhcDogJ3dyYXAnIH1dfSBhcmlhLWxhYmVsPVwiTmd14buTbiB0aGFtIGNoaeG6v3VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7bWVzc2FnZS5zb3VyY2VFdmlkZW5jZS5tYXAoKHJlZmVyZW5jZSwgaW5kZXgpID0+IChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPENoaXAga2V5PXtgJHtyZWZlcmVuY2UudHlwZX06JHtyZWZlcmVuY2UuaWR9OiR7aW5kZXh9YH0gc2l6ZT1cInNtYWxsXCIgdmFyaWFudD1cIm91dGxpbmVkXCIgbGFiZWw9e2Ake3JlZmVyZW5jZS50eXBlfSDCtyAke3JlZmVyZW5jZS5pZH1gfSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9TdGFjaz5cbiAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAgPFN0YWNrIGRpcmVjdGlvbj1cInJvd1wiIGFsaWduSXRlbXM9XCJjZW50ZXJcIiBzeD17W2xheW91dFN4LmluYm94LmNvbXBvc2VyQWN0aW9uR2FwLCB7IGZsZXhXcmFwOiAnd3JhcCcgfV19PlxuICAgICAgICAgICAgICAgICAgICAgICAgPFR5cG9ncmFwaHkgdmFyaWFudD1cImNhcHRpb25cIiBjb2xvcj1cInRleHQuc2Vjb25kYXJ5XCI+e2RhdGVUaW1lKG1lc3NhZ2UuY3JlYXRlZEF0LCB0aW1lem9uZSl9IMK3IHttZXNzYWdlLnN0YXR1c308L1R5cG9ncmFwaHk+XG4gICAgICAgICAgICAgICAgICAgICAgICA8QnV0dG9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZT1cInNtYWxsXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgxJDDoW5oIGdpw6EgdGluIG5o4bqvbiBj4bunYSAke3NlbmRlckxhYmVsfSBsw7pjICR7ZGF0ZVRpbWUobWVzc2FnZS5jcmVhdGVkQXQsIHRpbWV6b25lKX06ICR7bWVzc2FnZVByZXZpZXd9YH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBvblJhdGUobWVzc2FnZSl9XG4gICAgICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgxJDDoW5oIGdpw6FcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvQnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8L1N0YWNrPlxuICAgICAgICAgICAgICAgIDwvU3RhY2s+XG4gICAgICAgICAgICA8L0JveD5cbiAgICAgICAgPC9TdGFjaz47XG4gICAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBDb252ZXJzYXRpb25Db250ZXh0UGFuZWwoeyBjb252ZXJzYXRpb24sIGNoaWxkcmVuIH06IHtcbiAgICBjb252ZXJzYXRpb246IENvbnZlcnNhdGlvbjtcbiAgICBjaGlsZHJlbj86IFJlYWN0Tm9kZTtcbn0pIHtcbiAgICBjb25zdCB7IHNob3AgfSA9IHVzZVNjb3BlKCk7XG4gICAgY29uc3QgY2FuUmVhZEN1c3RvbWVycyA9IHVzZUNhbignY3VzdG9tZXJzLnJlYWQnKTtcbiAgICBjb25zdCBjYW5DcmVhdGVPcmRlcnMgPSB1c2VDYW4oJ29yZGVycy53cml0ZScpO1xuICAgIGNvbnN0IG1ldGFkYXRhID0gdXNlQXBpKCdnZXRJbmJveE1ldGFkYXRhJyk7XG4gICAgY29uc3QgYXNzaWduID0gdXNlQ29tbWFuZCgnYXNzaWduQ29udmVyc2F0aW9uJywgWydnZXRDb252ZXJzYXRpb24nLCAnbGlzdENvbnZlcnNhdGlvbnMnXSk7XG4gICAgY29uc3QgW2Fzc2lnbmVlLCBzZXRBc3NpZ25lZV0gPSB1c2VTdGF0ZSgnJyk7XG5cbiAgICByZXR1cm4gKFxuICAgICAgICA8Qm94XG4gICAgICAgICAgICBkYXRhLXRlc3RpZD1cImluYm94LWNvbnRleHQtcGFuZWxcIlxuICAgICAgICAgICAgY29tcG9uZW50PVwiYXNpZGVcIlxuICAgICAgICAgICAgYXJpYS1sYWJlbD1cIkLhu5FpIGPhuqNuaCBraMOhY2ggaMOgbmdcIlxuICAgICAgICAgICAgdGFiSW5kZXg9ezB9XG4gICAgICAgICAgICBzeD17eyBtaW5XaWR0aDogMCwgbWluSGVpZ2h0OiAwLCBtYXhIZWlnaHQ6IHsgeGw6IDY1MCB9LCBvdmVyZmxvd1k6IHsgeGw6ICdhdXRvJyB9IH19XG4gICAgICAgID5cbiAgICAgICAgICAgIDxQYW5lbCB0aXRsZT1cIkLhu5FpIGPhuqNuaCBraMOhY2ggaMOgbmdcIj5cbiAgICAgICAgICAgICAgICA8Qm94IGRhdGEtdGVzdGlkPVwiaW5ib3gtY29udGV4dC1jb250ZW50XCIgc3g9e2xheW91dFN4LmluYm94LmNvbnRleHRJbnNldH0+XG4gICAgICAgICAgICAgICAgICAgIDxEZXRhaWxMaW5lIGxhYmVsPVwiVHLhuqFuZyB0aMOhaVwiPjxTdGF0dXMgdmFsdWU9e2NvbnZlcnNhdGlvbi5zdGF0dXN9IC8+PC9EZXRhaWxMaW5lPlxuICAgICAgICAgICAgICAgICAgICA8RGV0YWlsTGluZSBsYWJlbD1cIkvDqm5oXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICB7bWV0YWRhdGEuZGF0YT8uZGF0YS5jaGFubmVscy5maW5kKGNoYW5uZWwgPT4gY2hhbm5lbC5pZCA9PT0gY29udmVyc2F0aW9uLmNoYW5uZWxJZCk/LmRpc3BsYXlOYW1lIHx8IGNvbnZlcnNhdGlvbi5jaGFubmVsSWR9XG4gICAgICAgICAgICAgICAgICAgIDwvRGV0YWlsTGluZT5cbiAgICAgICAgICAgICAgICAgICAge2NhblJlYWRDdXN0b21lcnNcbiAgICAgICAgICAgICAgICAgICAgICAgID8gPFJvdXRlTGluayB0bz17YC9zLyR7c2hvcC5pZH0vY3VzdG9tZXJzLyR7Y29udmVyc2F0aW9uLmN1c3RvbWVySWR9YH0+SOG7kyBzxqEga2jDoWNoPC9Sb3V0ZUxpbms+XG4gICAgICAgICAgICAgICAgICAgICAgICA6IDxUeXBvZ3JhcGh5IHZhcmlhbnQ9XCJjYXB0aW9uXCIgY29sb3I9XCJ0ZXh0LnNlY29uZGFyeVwiPlRow7RuZyB0aW4ga2jDoWNoIGLhu4sg4bqpbiB0aGVvIHF1eeG7gW4gaGnhu4duIHThuqFpLjwvVHlwb2dyYXBoeT59XG4gICAgICAgICAgICAgICAgICAgIHtjYW5DcmVhdGVPcmRlcnMgJiYgKFxuICAgICAgICAgICAgICAgICAgICAgICAgPFJvdXRlTGluayB0bz17YC9zLyR7c2hvcC5pZH0vb3JkZXJzL25ldz9jdXN0b21lcklkPSR7Y29udmVyc2F0aW9uLmN1c3RvbWVySWR9JmNvbnZlcnNhdGlvbklkPSR7Y29udmVyc2F0aW9uLmlkfWB9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFThuqFvIMSRxqFuIHThu6sgaOG7mWkgdGhv4bqhaVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9Sb3V0ZUxpbms+XG4gICAgICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICAgICAgICAgIDxEaXZpZGVyIHN4PXtbbGF5b3V0U3guc3VyZmFjZS5zZWN0aW9uQmVmb3JlLCBsYXlvdXRTeC5ub3RpY2UuYWZ0ZXJHYXBdfSAvPlxuICAgICAgICAgICAgICAgICAgICA8VGV4dEZpZWxkIGxhYmVsPVwiR2lhbyBjaG8gbmjDom4gdmnDqm5cIiBzZWxlY3QgZnVsbFdpZHRoIHNpemU9XCJzbWFsbFwiIHZhbHVlPXthc3NpZ25lZX0gb25DaGFuZ2U9e2V2ZW50ID0+IHNldEFzc2lnbmVlKGV2ZW50LnRhcmdldC52YWx1ZSl9PlxuICAgICAgICAgICAgICAgICAgICAgICAgPE1lbnVJdGVtIHZhbHVlPVwiXCI+Q2jhu41uIG5ow6JuIHZpw6puPC9NZW51SXRlbT5cbiAgICAgICAgICAgICAgICAgICAgICAgIHttZXRhZGF0YS5kYXRhPy5kYXRhLmFzc2lnbmVlcy5tYXAodXNlciA9PiA8TWVudUl0ZW0ga2V5PXt1c2VyLnVzZXJJZH0gdmFsdWU9e3VzZXIudXNlcklkfT57dXNlci5kaXNwbGF5TmFtZX08L01lbnVJdGVtPil9XG4gICAgICAgICAgICAgICAgICAgIDwvVGV4dEZpZWxkPlxuICAgICAgICAgICAgICAgICAgICA8TXV0YXRpb25CdXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgIHBlcm1pc3Npb249XCJjb252ZXJzYXRpb25zLmFzc2lnblwiXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZD17IWFzc2lnbmVlfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnVzeT17YXNzaWduLnBlbmRpbmd9XG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdm9pZCBhc3NpZ24uZXhlY3V0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHsgY29udmVyc2F0aW9uSWQ6IGNvbnZlcnNhdGlvbi5pZCB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBib2R5OiB7IHVzZXJJZDogYXNzaWduZWUsIGV4cGVjdGVkVmVyc2lvbjogY29udmVyc2F0aW9uLnZlcnNpb24gfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaCgoKSA9PiB1bmRlZmluZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICAgICAgUGjDom4gY8O0bmdcbiAgICAgICAgICAgICAgICAgICAgPC9NdXRhdGlvbkJ1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgPEVycm9yTm90aWNlIGVycm9yPXthc3NpZ24uZXJyb3J9IC8+XG4gICAgICAgICAgICAgICAgICAgIDxBbGVydCBzZXZlcml0eT1cImluZm9cIiBzeD17bGF5b3V0U3guc3VyZmFjZS5zZWN0aW9uQmVmb3JlfT5cbiAgICAgICAgICAgICAgICAgICAgICAgIOG6om5oL3RpbiB0aG/huqFpIGNo4buJIGLhuq10IGtoaSBo4bujcCDEkeG7k25nIGvDqm5oIHjDoWMgbmjhuq1uIGjhu5cgdHLhu6MuIFBoacOqbiBi4bqjbiBBUEkgaGnhu4duIHThuqFpIGPhu6dhIMO0IHNv4bqhbiBjaOG7iSBn4butaSB2xINuIGLhuqNuLlxuICAgICAgICAgICAgICAgICAgICA8L0FsZXJ0PlxuICAgICAgICAgICAgICAgICAgICB7Y2hpbGRyZW59XG4gICAgICAgICAgICAgICAgPC9Cb3g+XG4gICAgICAgICAgICA8L1BhbmVsPlxuICAgICAgICA8L0JveD5cbiAgICApO1xufVxuIl0sImZpbGUiOiJDOi9Vc2Vycy9Kb2tlci1QQy9Eb2N1bWVudHMvUHJvamVjdHMvQm90LUFJLUJhbi1oYW5nLUZCL0JvdFNhbGVzQUlfRnJvbnRlbmQvYXBwcy93ZWIvc3JjL21vZHVsZXMvaW5ib3gvY29udmVyc2F0aW9uLWNvbXBvbmVudHMudHN4In0=