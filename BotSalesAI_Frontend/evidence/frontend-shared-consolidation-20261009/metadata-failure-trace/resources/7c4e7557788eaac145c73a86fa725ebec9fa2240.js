import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/modules/inbox/conversation-components.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-90992-a38d2d9e-fc8a-4f0f-a010-8fb64b6607d4/deps/react_jsx-dev-runtime.js?v=f1f6fcd8"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
import __vite__cjsImport3_react from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-90992-a38d2d9e-fc8a-4f0f-a010-8fb64b6607d4/deps/react.js?v=f1f6fcd8"; const useRef = __vite__cjsImport3_react["useRef"]; const useState = __vite__cjsImport3_react["useState"];
import { visualSx } from "/src/shared/ui/visual.ts";
import { Alert, Box, Button, Chip, Divider, FormControlLabel, Checkbox, MenuItem, Stack, TextField, Typography } from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-90992-a38d2d9e-fc8a-4f0f-a010-8fb64b6607d4/deps/@mui_material.js?v=a3a8df36";
import SendRounded from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-90992-a38d2d9e-fc8a-4f0f-a010-8fb64b6607d4/deps/@mui_icons-material_SendRounded.js?v=5f52a22a";
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
      sx: [layoutSx.inbox.composerInset, { borderTop: 1, borderColor: "divider" }],
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

//# sourceMappingURL=data:application/json;base64,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QUEsUUFZQTtBQUFBLFFBQ0EsdUJBQUMsZUFBWSxPQUFPbUUsT0FBTzVELFNBQTNCO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBaUM7QUFBQSxRQUNqQyx1QkFBQyxTQUFNLFVBQVMsUUFBTyxJQUFJN0MsU0FBU2lGLFFBQVF3QyxlQUFjLDJIQUExRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBRUE7QUFBQSxRQUNDdEI7QUFBQUEsV0FuQ0w7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQW9DQSxLQXJDSjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBc0NBO0FBQUE7QUFBQSxJQTdDSjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUE4Q0E7QUFFUjtBQUFDQyxJQTVEZUYsMEJBQXdCO0FBQUEsVUFJbkIzRyxVQUNRRCxRQUNEQSxRQUNQRixRQUNGQyxVQUFVO0FBQUE7QUFBQSxNQVJiNkc7QUFBd0IsSUFBQThCLElBQUEvQixLQUFBZ0M7QUFBQSxhQUFBRCxJQUFBO0FBQUEsYUFBQS9CLEtBQUE7QUFBQSxhQUFBZ0MsS0FBQSIsIm5hbWVzIjpbInVzZVJlZiIsInVzZVN0YXRlIiwidmlzdWFsU3giLCJBbGVydCIsIkJveCIsIkJ1dHRvbiIsIkNoaXAiLCJEaXZpZGVyIiwiRm9ybUNvbnRyb2xMYWJlbCIsIkNoZWNrYm94IiwiTWVudUl0ZW0iLCJTdGFjayIsIlRleHRGaWVsZCIsIlR5cG9ncmFwaHkiLCJTZW5kUm91bmRlZCIsImNvbG9ycyIsInVzZUFwaSIsInVzZUNvbW1hbmQiLCJ1c2VDYW4iLCJ1c2VTY29wZSIsImxpbWl0Q29kZVBvaW50cyIsImRhdGVUaW1lIiwiRGV0YWlsTGluZSIsIkVycm9yTm90aWNlIiwiTXV0YXRpb25CdXR0b24iLCJQYW5lbCIsIlJvdXRlTGluayIsIlN0YXR1cyIsImxheW91dFN4IiwiQ29udmVyc2F0aW9uQ29tcG9zZXIiLCJjb252ZXJzYXRpb24iLCJfcyIsInNlc3Npb24iLCJvbmxpbmUiLCJjYW5SZXBseSIsInNlbmQiLCJub3RlIiwidGV4dCIsInNldFRleHQiLCJpbnRlcm5hbCIsInNldEludGVybmFsIiwicmV2aXNpb24iLCJjdXJyZW50Q29udmVyc2F0aW9uIiwiaWQiLCJjdXJyZW50IiwiY2FuU2VuZCIsIm1vZGUiLCJhc3NpZ25lZFVzZXJJZCIsInVzZXIiLCJzZW5kRWxpZ2liaWxpdHkiLCJzdGF0ZSIsInN1Ym1pdCIsInRyaW0iLCJwZW5kaW5nIiwidW5yZXNvbHZlZCIsInN1Ym1pdHRlZFJldmlzaW9uIiwic3VibWl0dGVkQ29udmVyc2F0aW9uIiwiZXhlY3V0ZSIsInBhdGgiLCJjb252ZXJzYXRpb25JZCIsImJvZHkiLCJjbGllbnRNZXNzYWdlSWQiLCJjcnlwdG8iLCJyYW5kb21VVUlEIiwiZXhwZWN0ZWRDb252ZXJzYXRpb25WZXJzaW9uIiwidmVyc2lvbiIsInVuZGVmaW5lZCIsImV2ZW50IiwicHJldmVudERlZmF1bHQiLCJpbmJveCIsImNvbXBvc2VySW5zZXQiLCJib3JkZXJUb3AiLCJib3JkZXJDb2xvciIsImVycm9yIiwidGFyZ2V0IiwiY2hlY2tlZCIsInZhbHVlIiwiY29tcG9zZXJDb250cm9sc0JlZm9yZUdhcCIsImNvbXBvc2VyQWN0aW9uR2FwIiwiQ29udmVyc2F0aW9uTWVzc2FnZUxpc3QiLCJtZXNzYWdlcyIsInRpbWV6b25lIiwib25SYXRlIiwic2xpY2UiLCJzb3J0IiwiYSIsImIiLCJjcmVhdGVkQXQiLCJsb2NhbGVDb21wYXJlIiwibWFwIiwibWVzc2FnZSIsInNlbmRlckxhYmVsIiwiZGlyZWN0aW9uIiwic2VuZGVyS2luZCIsIm1lc3NhZ2VUZXh0IiwicmVwbGFjZSIsInByZXZpZXciLCJBcnJheSIsImZyb20iLCJqb2luIiwibWVzc2FnZVByZXZpZXciLCJ0cmltRW5kIiwiYnViYmxlSW5zZXQiLCJtYXhXaWR0aCIsImJvcmRlclJhZGl1cyIsInJhZGl1cyIsImJ1YmJsZSIsImJnY29sb3IiLCJzZWxlY3RlZCIsInN1cmZhY2UiLCJyYWlzZWQiLCJib3JkZXIiLCJoZXJvQm9yZGVyIiwibWVzc2FnZU1ldGFHYXAiLCJtZXNzYWdlQ29udGVudEdhcCIsIndoaXRlU3BhY2UiLCJvdmVyZmxvd1dyYXAiLCJzb3VyY2VFdmlkZW5jZSIsImxlbmd0aCIsImNvbXBhY3RDb250ZW50R2FwIiwiZmxleFdyYXAiLCJyZWZlcmVuY2UiLCJpbmRleCIsInR5cGUiLCJzdGF0dXMiLCJfYzIiLCJDb252ZXJzYXRpb25Db250ZXh0UGFuZWwiLCJjaGlsZHJlbiIsIl9zMiIsInNob3AiLCJjYW5SZWFkQ3VzdG9tZXJzIiwiY2FuQ3JlYXRlT3JkZXJzIiwibWV0YWRhdGEiLCJhc3NpZ24iLCJhc3NpZ25lZSIsInNldEFzc2lnbmVlIiwibWluV2lkdGgiLCJtaW5IZWlnaHQiLCJtYXhIZWlnaHQiLCJ4bCIsIm92ZXJmbG93WSIsImNvbnRleHRJbnNldCIsImRhdGEiLCJjaGFubmVscyIsImZpbmQiLCJjaGFubmVsIiwiY2hhbm5lbElkIiwiZGlzcGxheU5hbWUiLCJjdXN0b21lcklkIiwic2VjdGlvbkJlZm9yZSIsIm5vdGljZSIsImFmdGVyR2FwIiwiYXNzaWduZWVzIiwidXNlcklkIiwiZXhwZWN0ZWRWZXJzaW9uIiwiY2F0Y2giLCJfYyIsIl9jMyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJjb252ZXJzYXRpb24tY29tcG9uZW50cy50c3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlUmVmLCB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IHZpc3VhbFN4IH0gZnJvbSAnQC9zaGFyZWQvdWkvdmlzdWFsJztcbmltcG9ydCB0eXBlIHsgUmVhY3ROb2RlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgQWxlcnQsIEJveCwgQnV0dG9uLCBDaGlwLCBEaXZpZGVyLCBGb3JtQ29udHJvbExhYmVsLCBDaGVja2JveCwgTWVudUl0ZW0sIFN0YWNrLCBUZXh0RmllbGQsIFR5cG9ncmFwaHkgfSBmcm9tICdAbXVpL21hdGVyaWFsJztcbmltcG9ydCBTZW5kUm91bmRlZCBmcm9tICdAbXVpL2ljb25zLW1hdGVyaWFsL1NlbmRSb3VuZGVkJztcbmltcG9ydCB0eXBlIHsgQ29udmVyc2F0aW9uLCBNZXNzYWdlIH0gZnJvbSAnQGJvdHNhbGVzL2NvbnRyYWN0cyc7XG5pbXBvcnQgeyBjb2xvcnMgfSBmcm9tICdAYm90c2FsZXMvdG9rZW5zJztcbmltcG9ydCB7IHVzZUFwaSwgdXNlQ29tbWFuZCB9IGZyb20gJ0Avc2hhcmVkL2FwaS9ob29rcyc7XG5pbXBvcnQgeyB1c2VDYW4sIHVzZVNjb3BlIH0gZnJvbSAnQC9zaGFyZWQvbW9kZWwvc2NvcGUnO1xuaW1wb3J0IHsgbGltaXRDb2RlUG9pbnRzLCBkYXRlVGltZSB9IGZyb20gJ0Avc2hhcmVkL21vZGVsL2Zvcm1hdCc7XG5pbXBvcnQgeyBEZXRhaWxMaW5lLCBFcnJvck5vdGljZSwgTXV0YXRpb25CdXR0b24sIFBhbmVsLCBSb3V0ZUxpbmssIFN0YXR1cyB9IGZyb20gJ0Avc2hhcmVkL3VpL2NvbXBvbmVudHMnO1xuaW1wb3J0IHsgbGF5b3V0U3ggfSBmcm9tICdAL3NoYXJlZC91aS9sYXlvdXQnO1xuXG5leHBvcnQgZnVuY3Rpb24gQ29udmVyc2F0aW9uQ29tcG9zZXIoeyBjb252ZXJzYXRpb24gfToge1xuICAgIGNvbnZlcnNhdGlvbjogQ29udmVyc2F0aW9uO1xufSkge1xuICAgIGNvbnN0IHsgc2Vzc2lvbiwgb25saW5lIH0gPSB1c2VTY29wZSgpO1xuICAgIGNvbnN0IGNhblJlcGx5ID0gdXNlQ2FuKCdjb252ZXJzYXRpb25zLnJlcGx5Jyk7XG4gICAgY29uc3Qgc2VuZCA9IHVzZUNvbW1hbmQoJ3NlbmRNZXNzYWdlJywgWydsaXN0TWVzc2FnZXMnLCAnZ2V0Q29udmVyc2F0aW9uJywgJ2xpc3RDb252ZXJzYXRpb25zJ10pO1xuICAgIGNvbnN0IG5vdGUgPSB1c2VDb21tYW5kKCdhZGRJbnRlcm5hbE5vdGUnLCBbJ2xpc3RNZXNzYWdlcyddKTtcbiAgICBjb25zdCBbdGV4dCwgc2V0VGV4dF0gPSB1c2VTdGF0ZSgnJyk7XG4gICAgY29uc3QgW2ludGVybmFsLCBzZXRJbnRlcm5hbF0gPSB1c2VTdGF0ZShmYWxzZSk7XG4gICAgY29uc3QgcmV2aXNpb24gPSB1c2VSZWYoMCk7XG4gICAgY29uc3QgY3VycmVudENvbnZlcnNhdGlvbiA9IHVzZVJlZihjb252ZXJzYXRpb24uaWQpO1xuICAgIGN1cnJlbnRDb252ZXJzYXRpb24uY3VycmVudCA9IGNvbnZlcnNhdGlvbi5pZDtcbiAgICBjb25zdCBjYW5TZW5kID0gY2FuUmVwbHkgJiYgb25saW5lICYmIChpbnRlcm5hbCB8fCAoXG4gICAgICAgIGNvbnZlcnNhdGlvbi5tb2RlID09PSAnaHVtYW4nICYmXG4gICAgICAgIGNvbnZlcnNhdGlvbi5hc3NpZ25lZFVzZXJJZCA9PT0gc2Vzc2lvbi51c2VyLmlkICYmXG4gICAgICAgIGNvbnZlcnNhdGlvbi5zZW5kRWxpZ2liaWxpdHkuc3RhdGUgPT09ICdhbGxvd2VkJ1xuICAgICkpO1xuXG4gICAgY29uc3Qgc3VibWl0ID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICBpZiAoIWNhblNlbmQgfHwgIXRleHQudHJpbSgpIHx8IHNlbmQucGVuZGluZyB8fCBub3RlLnBlbmRpbmcgfHwgc2VuZC51bnJlc29sdmVkIHx8IG5vdGUudW5yZXNvbHZlZCkgcmV0dXJuO1xuICAgICAgICBjb25zdCBzdWJtaXR0ZWRSZXZpc2lvbiA9IHJldmlzaW9uLmN1cnJlbnQ7XG4gICAgICAgIGNvbnN0IHN1Ym1pdHRlZENvbnZlcnNhdGlvbiA9IGNvbnZlcnNhdGlvbi5pZDtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmIChpbnRlcm5hbCkge1xuICAgICAgICAgICAgICAgIGF3YWl0IG5vdGUuZXhlY3V0ZSh7IHBhdGg6IHsgY29udmVyc2F0aW9uSWQ6IGNvbnZlcnNhdGlvbi5pZCB9LCBib2R5OiB7IHRleHQ6IHRleHQudHJpbSgpIH0gfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGF3YWl0IHNlbmQuZXhlY3V0ZSh7XG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHsgY29udmVyc2F0aW9uSWQ6IGNvbnZlcnNhdGlvbi5pZCB9LFxuICAgICAgICAgICAgICAgICAgICBib2R5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGllbnRNZXNzYWdlSWQ6IGNyeXB0by5yYW5kb21VVUlEKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiB0ZXh0LnRyaW0oKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkQ29udmVyc2F0aW9uVmVyc2lvbjogY29udmVyc2F0aW9uLnZlcnNpb24sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmV2aXNpb24uY3VycmVudCA9PT0gc3VibWl0dGVkUmV2aXNpb24gJiYgY3VycmVudENvbnZlcnNhdGlvbi5jdXJyZW50ID09PSBzdWJtaXR0ZWRDb252ZXJzYXRpb24pIHNldFRleHQoJycpO1xuICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgIC8vIFVua25vd24gc2VuZHMgcHJlc2VydmUgdGV4dCBhbmQgZGlzYWJsZSByZXRyaWVzIGluIHRoZSBjb21tYW5kIGhvb2suXG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIChcbiAgICAgICAgPEJveFxuICAgICAgICAgICAgY29tcG9uZW50PVwiZm9ybVwiXG4gICAgICAgICAgICBkYXRhLWRyYWZ0LWNsZWFuPXt0ZXh0ID8gdW5kZWZpbmVkIDogJ3RydWUnfVxuICAgICAgICAgICAgb25TdWJtaXQ9e2V2ZW50ID0+IHtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIHZvaWQgc3VibWl0KCk7XG4gICAgICAgICAgICB9fVxuICAgICAgICAgICAgc3g9e1tsYXlvdXRTeC5pbmJveC5jb21wb3Nlckluc2V0LCB7IGJvcmRlclRvcDogMSwgYm9yZGVyQ29sb3I6ICdkaXZpZGVyJyB9XX1cbiAgICAgICAgPlxuICAgICAgICAgICAgPEVycm9yTm90aWNlIGVycm9yPXtzZW5kLmVycm9yIHx8IG5vdGUuZXJyb3J9IC8+XG4gICAgICAgICAgICA8Rm9ybUNvbnRyb2xMYWJlbFxuICAgICAgICAgICAgICAgIGxhYmVsPVwiR2hpIGNow7ogbuG7mWkgYuG7mSAoa2jDtG5nIGfhu61pIGtow6FjaClcIlxuICAgICAgICAgICAgICAgIGNvbnRyb2w9ezxDaGVja2JveCBjaGVja2VkPXtpbnRlcm5hbH0gb25DaGFuZ2U9e2V2ZW50ID0+IHsgcmV2aXNpb24uY3VycmVudCArPSAxOyBzZXRJbnRlcm5hbChldmVudC50YXJnZXQuY2hlY2tlZCk7IH19IGRpc2FibGVkPXshY2FuUmVwbHl9IC8+fVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxUZXh0RmllbGRcbiAgICAgICAgICAgICAgICBmdWxsV2lkdGhcbiAgICAgICAgICAgICAgICBtdWx0aWxpbmVcbiAgICAgICAgICAgICAgICBtaW5Sb3dzPXsyfVxuICAgICAgICAgICAgICAgIG1heFJvd3M9ezd9XG4gICAgICAgICAgICAgICAgbGFiZWw9e2ludGVybmFsID8gJ0doaSBjaMO6IGNobyBuaMOzbScgOiAnTuG7mWkgZHVuZyB0cuG6oyBs4budaSBraMOhY2gnfVxuICAgICAgICAgICAgICAgIHZhbHVlPXt0ZXh0fVxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXtldmVudCA9PiB7IHJldmlzaW9uLmN1cnJlbnQgKz0gMTsgc2V0VGV4dChsaW1pdENvZGVQb2ludHMoZXZlbnQudGFyZ2V0LnZhbHVlLCBpbnRlcm5hbCA/IDEwMDAwIDogMjAwMDApKTsgfX1cbiAgICAgICAgICAgICAgICBkaXNhYmxlZD17IWNhblJlcGx5fVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxTdGFjayBkaXJlY3Rpb249XCJyb3dcIiBhbGlnbkl0ZW1zPVwiY2VudGVyXCIganVzdGlmeUNvbnRlbnQ9XCJzcGFjZS1iZXR3ZWVuXCIgc3g9e1tsYXlvdXRTeC5pbmJveC5jb21wb3NlckNvbnRyb2xzQmVmb3JlR2FwLCBsYXlvdXRTeC5pbmJveC5jb21wb3NlckFjdGlvbkdhcF19PlxuICAgICAgICAgICAgICAgIDxUeXBvZ3JhcGh5IHZhcmlhbnQ9XCJjYXB0aW9uXCIgY29sb3I9XCJ0ZXh0LnNlY29uZGFyeVwiPlxuICAgICAgICAgICAgICAgICAgICB7IW9ubGluZSA/ICfEkGFuZyBuZ2/huqFpIHR1eeG6v24nIDogIWNhblNlbmQgPyAnQ+G6p24gdGnhur9wIHF14bqjbiBob+G6t2MgcXV54buBbiBn4butaSBo4bujcCBs4buHJyA6ICdUaW4gZ+G7rWkgcXVhIEFQSSwga2jDtG5nIGTDuW5nIEhUTUwgdOG7qyBBSSd9XG4gICAgICAgICAgICAgICAgPC9UeXBvZ3JhcGh5PlxuICAgICAgICAgICAgICAgIDxCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cInN1Ym1pdFwiXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhbnQ9XCJjb250YWluZWRcIlxuICAgICAgICAgICAgICAgICAgICBlbmRJY29uPXs8U2VuZFJvdW5kZWQgLz59XG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXshY2FuU2VuZCB8fCAhdGV4dC50cmltKCkgfHwgc2VuZC5wZW5kaW5nIHx8IG5vdGUucGVuZGluZyB8fCBzZW5kLnVucmVzb2x2ZWQgfHwgbm90ZS51bnJlc29sdmVkfVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAge2ludGVybmFsID8gJ0zGsHUgZ2hpIGNow7onIDogJ0fhu61pIHRy4bqjIGzhu51pJ31cbiAgICAgICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICAgIDwvU3RhY2s+XG4gICAgICAgIDwvQm94PlxuICAgICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBDb252ZXJzYXRpb25NZXNzYWdlTGlzdCh7IG1lc3NhZ2VzLCB0aW1lem9uZSwgb25SYXRlIH06IHtcbiAgICBtZXNzYWdlczogTWVzc2FnZVtdO1xuICAgIHRpbWV6b25lOiBzdHJpbmc7XG4gICAgb25SYXRlOiAobWVzc2FnZTogTWVzc2FnZSkgPT4gdm9pZDtcbn0pIHtcbiAgICByZXR1cm4gbWVzc2FnZXMuc2xpY2UoKS5zb3J0KChhLCBiKSA9PiBhLmNyZWF0ZWRBdC5sb2NhbGVDb21wYXJlKGIuY3JlYXRlZEF0KSkubWFwKG1lc3NhZ2UgPT4ge1xuICAgICAgICBjb25zdCBzZW5kZXJMYWJlbCA9IG1lc3NhZ2UuZGlyZWN0aW9uID09PSAnaW50ZXJuYWwnID8gJ0doaSBjaMO6IG7hu5lpIGLhu5knIDogbWVzc2FnZS5zZW5kZXJLaW5kID09PSAnY3VzdG9tZXInID8gJ0tow6FjaCcgOiBtZXNzYWdlLnNlbmRlcktpbmQgPT09ICdib3QnID8gJ1Ry4bujIGzDvSBBSScgOiAnTmjDom4gdmnDqm4nO1xuICAgICAgICBjb25zdCBtZXNzYWdlVGV4dCA9IG1lc3NhZ2UudGV4dC5yZXBsYWNlKC9cXHMrL2csICcgJykudHJpbSgpO1xuICAgICAgICBjb25zdCBwcmV2aWV3ID0gQXJyYXkuZnJvbShtZXNzYWdlVGV4dCkuc2xpY2UoMCwgNjQpLmpvaW4oJycpO1xuICAgICAgICBjb25zdCBtZXNzYWdlUHJldmlldyA9IHByZXZpZXcgPT09IG1lc3NhZ2VUZXh0ID8gbWVzc2FnZVRleHQgOiBgJHtwcmV2aWV3LnRyaW1FbmQoKX3igKZgO1xuXG4gICAgICAgIHJldHVybiA8U3RhY2sga2V5PXttZXNzYWdlLmlkfSBhbGlnbkl0ZW1zPXttZXNzYWdlLmRpcmVjdGlvbiA9PT0gJ2luYm91bmQnID8gJ2ZsZXgtc3RhcnQnIDogJ2ZsZXgtZW5kJ30+XG4gICAgICAgICAgICA8Qm94IGRhdGEtdGVzdGlkPVwiaW5ib3gtbWVzc2FnZS1idWJibGVcIiBzeD17W2xheW91dFN4LmluYm94LmJ1YmJsZUluc2V0LCB7XG4gICAgICAgICAgICAgICAgbWF4V2lkdGg6ICc4OCUnLFxuICAgICAgICAgICAgICAgIGJvcmRlclJhZGl1czogdmlzdWFsU3gucmFkaXVzLmJ1YmJsZSxcbiAgICAgICAgICAgICAgICBiZ2NvbG9yOiBtZXNzYWdlLmRpcmVjdGlvbiA9PT0gJ2ludGVybmFsJyA/IGNvbG9ycy5zZWxlY3RlZCA6IG1lc3NhZ2UuZGlyZWN0aW9uID09PSAnaW5ib3VuZCcgPyBjb2xvcnMuc3VyZmFjZSA6IGNvbG9ycy5yYWlzZWQsXG4gICAgICAgICAgICAgICAgYm9yZGVyOiBtZXNzYWdlLmRpcmVjdGlvbiA9PT0gJ2ludGVybmFsJyA/ICcxcHggc29saWQnIDogJ25vbmUnLFxuICAgICAgICAgICAgICAgIGJvcmRlckNvbG9yOiBjb2xvcnMuaGVyb0JvcmRlcixcbiAgICAgICAgICAgIH1dfT5cbiAgICAgICAgICAgICAgICA8U3RhY2sgZGF0YS10ZXN0aWQ9XCJpbmJveC1tZXNzYWdlLW1ldGEtZmxvd1wiIHN4PXtsYXlvdXRTeC5pbmJveC5tZXNzYWdlTWV0YUdhcH0+XG4gICAgICAgICAgICAgICAgICAgIDxTdGFjayBkYXRhLXRlc3RpZD1cImluYm94LW1lc3NhZ2UtY29udGVudC1mbG93XCIgc3g9e2xheW91dFN4LmluYm94Lm1lc3NhZ2VDb250ZW50R2FwfT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxUeXBvZ3JhcGh5IHZhcmlhbnQ9XCJjYXB0aW9uXCIgY29sb3I9XCJ0ZXh0LnNlY29uZGFyeVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtzZW5kZXJMYWJlbH1cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvVHlwb2dyYXBoeT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxUeXBvZ3JhcGh5IHN4PXt7IHdoaXRlU3BhY2U6ICdwcmUtd3JhcCcsIG92ZXJmbG93V3JhcDogJ2FueXdoZXJlJyB9fT57bWVzc2FnZS50ZXh0fTwvVHlwb2dyYXBoeT5cbiAgICAgICAgICAgICAgICAgICAgPC9TdGFjaz5cbiAgICAgICAgICAgICAgICAgICAge21lc3NhZ2Uuc291cmNlRXZpZGVuY2UubGVuZ3RoID4gMCAmJiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8U3RhY2sgZGlyZWN0aW9uPVwicm93XCIgc3g9e1tsYXlvdXRTeC5zdXJmYWNlLmNvbXBhY3RDb250ZW50R2FwLCB7IGZsZXhXcmFwOiAnd3JhcCcgfV19IGFyaWEtbGFiZWw9XCJOZ3Xhu5NuIHRoYW0gY2hp4bq/dVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHttZXNzYWdlLnNvdXJjZUV2aWRlbmNlLm1hcCgocmVmZXJlbmNlLCBpbmRleCkgPT4gKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8Q2hpcCBrZXk9e2Ake3JlZmVyZW5jZS50eXBlfToke3JlZmVyZW5jZS5pZH06JHtpbmRleH1gfSBzaXplPVwic21hbGxcIiB2YXJpYW50PVwib3V0bGluZWRcIiBsYWJlbD17YCR7cmVmZXJlbmNlLnR5cGV9IMK3ICR7cmVmZXJlbmNlLmlkfWB9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L1N0YWNrPlxuICAgICAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgICAgICAgICA8U3RhY2sgZGlyZWN0aW9uPVwicm93XCIgYWxpZ25JdGVtcz1cImNlbnRlclwiIHN4PXtbbGF5b3V0U3guaW5ib3guY29tcG9zZXJBY3Rpb25HYXAsIHsgZmxleFdyYXA6ICd3cmFwJyB9XX0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8VHlwb2dyYXBoeSB2YXJpYW50PVwiY2FwdGlvblwiIGNvbG9yPVwidGV4dC5zZWNvbmRhcnlcIj57ZGF0ZVRpbWUobWVzc2FnZS5jcmVhdGVkQXQsIHRpbWV6b25lKX0gwrcge21lc3NhZ2Uuc3RhdHVzfTwvVHlwb2dyYXBoeT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxCdXR0b25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaXplPVwic21hbGxcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2DEkMOhbmggZ2nDoSB0aW4gbmjhuq9uIGPhu6dhICR7c2VuZGVyTGFiZWx9IGzDumMgJHtkYXRlVGltZShtZXNzYWdlLmNyZWF0ZWRBdCwgdGltZXpvbmUpfTogJHttZXNzYWdlUHJldmlld31gfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9uUmF0ZShtZXNzYWdlKX1cbiAgICAgICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICDEkMOhbmggZ2nDoVxuICAgICAgICAgICAgICAgICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgICAgICAgICAgIDwvU3RhY2s+XG4gICAgICAgICAgICAgICAgPC9TdGFjaz5cbiAgICAgICAgICAgIDwvQm94PlxuICAgICAgICA8L1N0YWNrPjtcbiAgICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIENvbnZlcnNhdGlvbkNvbnRleHRQYW5lbCh7IGNvbnZlcnNhdGlvbiwgY2hpbGRyZW4gfToge1xuICAgIGNvbnZlcnNhdGlvbjogQ29udmVyc2F0aW9uO1xuICAgIGNoaWxkcmVuPzogUmVhY3ROb2RlO1xufSkge1xuICAgIGNvbnN0IHsgc2hvcCB9ID0gdXNlU2NvcGUoKTtcbiAgICBjb25zdCBjYW5SZWFkQ3VzdG9tZXJzID0gdXNlQ2FuKCdjdXN0b21lcnMucmVhZCcpO1xuICAgIGNvbnN0IGNhbkNyZWF0ZU9yZGVycyA9IHVzZUNhbignb3JkZXJzLndyaXRlJyk7XG4gICAgY29uc3QgbWV0YWRhdGEgPSB1c2VBcGkoJ2dldEluYm94TWV0YWRhdGEnKTtcbiAgICBjb25zdCBhc3NpZ24gPSB1c2VDb21tYW5kKCdhc3NpZ25Db252ZXJzYXRpb24nLCBbJ2dldENvbnZlcnNhdGlvbicsICdsaXN0Q29udmVyc2F0aW9ucyddKTtcbiAgICBjb25zdCBbYXNzaWduZWUsIHNldEFzc2lnbmVlXSA9IHVzZVN0YXRlKCcnKTtcblxuICAgIHJldHVybiAoXG4gICAgICAgIDxCb3hcbiAgICAgICAgICAgIGRhdGEtdGVzdGlkPVwiaW5ib3gtY29udGV4dC1wYW5lbFwiXG4gICAgICAgICAgICBjb21wb25lbnQ9XCJhc2lkZVwiXG4gICAgICAgICAgICBhcmlhLWxhYmVsPVwiQuG7kWkgY+G6o25oIGtow6FjaCBow6BuZ1wiXG4gICAgICAgICAgICB0YWJJbmRleD17MH1cbiAgICAgICAgICAgIHN4PXt7IG1pbldpZHRoOiAwLCBtaW5IZWlnaHQ6IDAsIG1heEhlaWdodDogeyB4bDogNjUwIH0sIG92ZXJmbG93WTogeyB4bDogJ2F1dG8nIH0gfX1cbiAgICAgICAgPlxuICAgICAgICAgICAgPFBhbmVsIHRpdGxlPVwiQuG7kWkgY+G6o25oIGtow6FjaCBow6BuZ1wiPlxuICAgICAgICAgICAgICAgIDxCb3ggZGF0YS10ZXN0aWQ9XCJpbmJveC1jb250ZXh0LWNvbnRlbnRcIiBzeD17bGF5b3V0U3guaW5ib3guY29udGV4dEluc2V0fT5cbiAgICAgICAgICAgICAgICAgICAgPERldGFpbExpbmUgbGFiZWw9XCJUcuG6oW5nIHRow6FpXCI+PFN0YXR1cyB2YWx1ZT17Y29udmVyc2F0aW9uLnN0YXR1c30gLz48L0RldGFpbExpbmU+XG4gICAgICAgICAgICAgICAgICAgIDxEZXRhaWxMaW5lIGxhYmVsPVwiS8OqbmhcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIHttZXRhZGF0YS5kYXRhPy5kYXRhLmNoYW5uZWxzLmZpbmQoY2hhbm5lbCA9PiBjaGFubmVsLmlkID09PSBjb252ZXJzYXRpb24uY2hhbm5lbElkKT8uZGlzcGxheU5hbWUgfHwgY29udmVyc2F0aW9uLmNoYW5uZWxJZH1cbiAgICAgICAgICAgICAgICAgICAgPC9EZXRhaWxMaW5lPlxuICAgICAgICAgICAgICAgICAgICB7Y2FuUmVhZEN1c3RvbWVyc1xuICAgICAgICAgICAgICAgICAgICAgICAgPyA8Um91dGVMaW5rIHRvPXtgL3MvJHtzaG9wLmlkfS9jdXN0b21lcnMvJHtjb252ZXJzYXRpb24uY3VzdG9tZXJJZH1gfT5I4buTIHPGoSBraMOhY2g8L1JvdXRlTGluaz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDogPFR5cG9ncmFwaHkgdmFyaWFudD1cImNhcHRpb25cIiBjb2xvcj1cInRleHQuc2Vjb25kYXJ5XCI+VGjDtG5nIHRpbiBraMOhY2ggYuG7iyDhuqluIHRoZW8gcXV54buBbiBoaeG7h24gdOG6oWkuPC9UeXBvZ3JhcGh5Pn1cbiAgICAgICAgICAgICAgICAgICAge2NhbkNyZWF0ZU9yZGVycyAmJiAoXG4gICAgICAgICAgICAgICAgICAgICAgICA8Um91dGVMaW5rIHRvPXtgL3MvJHtzaG9wLmlkfS9vcmRlcnMvbmV3P2N1c3RvbWVySWQ9JHtjb252ZXJzYXRpb24uY3VzdG9tZXJJZH0mY29udmVyc2F0aW9uSWQ9JHtjb252ZXJzYXRpb24uaWR9YH0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgVOG6oW8gxJHGoW4gdOG7qyBo4buZaSB0aG/huqFpXG4gICAgICAgICAgICAgICAgICAgICAgICA8L1JvdXRlTGluaz5cbiAgICAgICAgICAgICAgICAgICAgKX1cbiAgICAgICAgICAgICAgICAgICAgPERpdmlkZXIgc3g9e1tsYXlvdXRTeC5zdXJmYWNlLnNlY3Rpb25CZWZvcmUsIGxheW91dFN4Lm5vdGljZS5hZnRlckdhcF19IC8+XG4gICAgICAgICAgICAgICAgICAgIDxUZXh0RmllbGQgbGFiZWw9XCJHaWFvIGNobyBuaMOibiB2acOqblwiIHNlbGVjdCBmdWxsV2lkdGggc2l6ZT1cInNtYWxsXCIgdmFsdWU9e2Fzc2lnbmVlfSBvbkNoYW5nZT17ZXZlbnQgPT4gc2V0QXNzaWduZWUoZXZlbnQudGFyZ2V0LnZhbHVlKX0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8TWVudUl0ZW0gdmFsdWU9XCJcIj5DaOG7jW4gbmjDom4gdmnDqm48L01lbnVJdGVtPlxuICAgICAgICAgICAgICAgICAgICAgICAge21ldGFkYXRhLmRhdGE/LmRhdGEuYXNzaWduZWVzLm1hcCh1c2VyID0+IDxNZW51SXRlbSBrZXk9e3VzZXIudXNlcklkfSB2YWx1ZT17dXNlci51c2VySWR9Pnt1c2VyLmRpc3BsYXlOYW1lfTwvTWVudUl0ZW0+KX1cbiAgICAgICAgICAgICAgICAgICAgPC9UZXh0RmllbGQ+XG4gICAgICAgICAgICAgICAgICAgIDxNdXRhdGlvbkJ1dHRvblxuICAgICAgICAgICAgICAgICAgICAgICAgcGVybWlzc2lvbj1cImNvbnZlcnNhdGlvbnMuYXNzaWduXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXshYXNzaWduZWV9XG4gICAgICAgICAgICAgICAgICAgICAgICBidXN5PXthc3NpZ24ucGVuZGluZ31cbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2b2lkIGFzc2lnbi5leGVjdXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogeyBjb252ZXJzYXRpb25JZDogY29udmVyc2F0aW9uLmlkIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJvZHk6IHsgdXNlcklkOiBhc3NpZ25lZSwgZXhwZWN0ZWRWZXJzaW9uOiBjb252ZXJzYXRpb24udmVyc2lvbiB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKCgpID0+IHVuZGVmaW5lZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAgICBQaMOibiBjw7RuZ1xuICAgICAgICAgICAgICAgICAgICA8L011dGF0aW9uQnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICA8RXJyb3JOb3RpY2UgZXJyb3I9e2Fzc2lnbi5lcnJvcn0gLz5cbiAgICAgICAgICAgICAgICAgICAgPEFsZXJ0IHNldmVyaXR5PVwiaW5mb1wiIHN4PXtsYXlvdXRTeC5zdXJmYWNlLnNlY3Rpb25CZWZvcmV9PlxuICAgICAgICAgICAgICAgICAgICAgICAg4bqibmgvdGluIHRob+G6oWkgY2jhu4kgYuG6rXQga2hpIGjhu6NwIMSR4buTbmcga8OqbmggeMOhYyBuaOG6rW4gaOG7lyB0cuG7oy4gUGhpw6puIGLhuqNuIEFQSSBoaeG7h24gdOG6oWkgY+G7p2Egw7Qgc2/huqFuIGNo4buJIGfhu61pIHbEg24gYuG6o24uXG4gICAgICAgICAgICAgICAgICAgIDwvQWxlcnQ+XG4gICAgICAgICAgICAgICAgICAgIHtjaGlsZHJlbn1cbiAgICAgICAgICAgICAgICA8L0JveD5cbiAgICAgICAgICAgIDwvUGFuZWw+XG4gICAgICAgIDwvQm94PlxuICAgICk7XG59XG4iXSwiZmlsZSI6IkM6L1VzZXJzL0pva2VyLVBDL0RvY3VtZW50cy9Qcm9qZWN0cy9Cb3QtQUktQmFuLWhhbmctRkIvQm90U2FsZXNBSV9Gcm9udGVuZC9hcHBzL3dlYi9zcmMvbW9kdWxlcy9pbmJveC9jb252ZXJzYXRpb24tY29tcG9uZW50cy50c3gifQ==