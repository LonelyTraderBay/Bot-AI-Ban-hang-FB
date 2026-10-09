import __vite__cjsImport0_react from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-90992-a38d2d9e-fc8a-4f0f-a010-8fb64b6607d4/deps/react.js?v=f1f6fcd8"; const useCallback = __vite__cjsImport0_react["useCallback"]; const useEffect = __vite__cjsImport0_react["useEffect"]; const useRef = __vite__cjsImport0_react["useRef"]; const useState = __vite__cjsImport0_react["useState"]; const useSyncExternalStore = __vite__cjsImport0_react["useSyncExternalStore"];
import { useInfiniteQuery, useQuery, useQueryClient } from "/@fs/C:/Users/Joker-PC/AppData/Local/Temp/botsales-vite-cache/ea27c7577456f6009d55/test-demo/playwright-90992-a38d2d9e-fc8a-4f0f-a010-8fb64b6607d4/deps/@tanstack_react-query.js?v=5da7775c";
import { operations } from "/@fs/C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB/BotSalesAI_Frontend/packages/contracts/src/index.ts";
import { request, subscribeScopeCancellation } from "/src/shared/api/client.ts";
import { ApiError, UnknownResultError } from "/src/shared/api/errors.ts";
import { useScope } from "/src/shared/model/scope.tsx";
import { rememberUnknown, hasUnknownIntent, subscribeIntents, intentSnapshot } from "/src/shared/api/intents.ts";
export function useApi(op, options = {}, enabled = true) {
  const scope = useScope();
  const { user } = scope.session;
  const path = { shopId: scope.shop.id, ...options.path };
  const query = options.query || {};
  return useQuery({
    queryKey: ["scope", user.id, scope.shop.id, scope.membership.permissionVersion, op, path, query],
    queryFn: ({ signal }) => request(op, { ...options, path, signal }),
    enabled,
    staleTime: 5e3,
    retry: (count, error) => count < 1 && (!(error instanceof ApiError) || error.status >= 500)
  });
}
export function usePagedApi(op, options = {}, enabled = true) {
  const scope = useScope();
  const { user } = scope.session;
  const path = { shopId: scope.shop.id, ...options.path };
  const { cursor: _cursor, limit: requestedLimit, ...filters } = options.query || {};
  const limit = typeof requestedLimit === "number" && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 20;
  const query = useInfiniteQuery({
    queryKey: ["scope", user.id, scope.shop.id, scope.membership.permissionVersion, op, path, { ...filters, limit, paged: true }],
    initialPageParam: void 0,
    queryFn: ({ signal, pageParam }) => request(op, { ...options, path, query: { ...filters, limit, cursor: pageParam }, signal }),
    getNextPageParam: (lastPage2) => {
      const page = lastPage2.page;
      return page?.hasMore && page.nextCursor ? page.nextCursor : void 0;
    },
    enabled,
    staleTime: 5e3,
    retry: (count, error) => count < 1 && (!(error instanceof ApiError) || error.status >= 500)
  });
  const pages = query.data?.pages || [];
  const lastPage = pages.at(-1);
  const data = lastPage ? {
    ...lastPage,
    data: pages.flatMap((page) => page.data)
  } : void 0;
  return {
    ...query,
    data,
    loadedCount: data ? data.data.length : 0,
    loadMore: () => query.hasNextPage ? query.fetchNextPage() : Promise.resolve(void 0),
    hasMore: Boolean(query.hasNextPage),
    isLoadingMore: query.isFetchingNextPage
  };
}
export function useCommand(op, invalidate) {
  const scope = useScope();
  const cache = useQueryClient();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);
  const intents = useSyncExternalStore(subscribeIntents, intentSnapshot, intentSnapshot);
  const unresolved = intents.some((intent) => intent.shopId === scope.shop.id && intent.operation === op);
  const mounted = useRef(false);
  const controllers = useRef(/* @__PURE__ */ new Set());
  const identity = `${scope.session.user.id}:${scope.shop.id}:${scope.membership.permissionVersion}:${op}`;
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  useEffect(() => {
    mounted.current = true;
    const active = controllers.current;
    return () => {
      mounted.current = false;
      for (const controller of active) controller.abort();
      active.clear();
    };
  }, [identity]);
  const execute = useCallback(async (...args) => {
    const options = args[0] ?? {};
    if (!mounted.current || currentIdentity.current !== identity || options.signal?.aborted)
      throw new DOMException("Màn hình hoặc phạm vi đã đóng.", "AbortError");
    if (inFlight.current || hasUnknownIntent(scope.shop.id, op))
      throw new ApiError(409, "IN_FLIGHT", "Thao tác đang xử lý hoặc chưa xác minh kết quả.");
    if (!scope.online)
      throw new ApiError(0, "OFFLINE", "Đang ngoại tuyến. Không gửi thay đổi.");
    inFlight.current = true;
    setPending(true);
    setError(null);
    const controller = new AbortController();
    controllers.current.add(controller);
    const cancel = () => controller.abort();
    const unsubscribe = subscribeScopeCancellation(cancel);
    options.signal?.addEventListener("abort", cancel, { once: true });
    const alive = () => mounted.current && currentIdentity.current === identity && !controller.signal.aborted;
    const assertAlive = () => {
      if (!alive()) throw new DOMException("Màn hình hoặc phạm vi đã đóng.", "AbortError");
    };
    const intentId = options.idempotencyKey || crypto.randomUUID();
    let commandId;
    let unsettled = false;
    try {
      assertAlive();
      const result = await request(op, { ...options, path: { shopId: scope.shop.id, ...options.path }, signal: controller.signal, idempotencyKey: intentId });
      let settledResult = result;
      if (operations[op].responseSchema === "CommandResponse" && result && typeof result === "object" && "data" in result) {
        const command = result.data;
        if (command && typeof command === "object" && "id" in command && typeof command.id === "string" && "status" in command) {
          let observed = command.status;
          commandId = command.id;
          unsettled = ["accepted", "running", "unknown"].includes(String(observed));
          if (observed === "failed")
            throw new ApiError(409, "COMMAND_FAILED", "Lệnh bị từ chối; xem kết quả kiểm tra của backend.");
          for (let attempt = 0; ["accepted", "running"].includes(String(observed)) && attempt < 8; attempt++) {
            assertAlive();
            await waitForPoll(400 + attempt * 150, controller.signal);
            assertAlive();
            let current;
            try {
              current = await request("getCommand", { path: { shopId: scope.shop.id, commandId: command.id }, signal: controller.signal });
            } catch {
              throw new UnknownResultError(intentId, command.id);
            }
            observed = current.data.status;
            unsettled = ["accepted", "running", "unknown"].includes(String(observed));
            settledResult = current;
            if (observed === "failed")
              throw new ApiError(409, current.data.problem?.code || "COMMAND_FAILED", current.data.problem?.detail || "Lệnh bị từ chối.");
          }
          if (["unknown", "accepted", "running"].includes(String(observed)))
            throw new UnknownResultError(intentId, command.id);
        }
      }
      assertAlive();
      await Promise.all(invalidate.map((id) => cache.invalidateQueries({ queryKey: ["scope", scope.session.user.id, scope.shop.id, scope.membership.permissionVersion, id] })));
      assertAlive();
      return settledResult;
    } catch (e) {
      const error2 = e instanceof Error ? e : new Error("Yêu cầu thất bại");
      if (alive()) setError(error2);
      if (error2 instanceof UnknownResultError) {
        rememberUnknown({ intentId: error2.intentId, commandId: error2.commandId || null, shopId: scope.shop.id, operation: op });
      } else if (unsettled) {
        rememberUnknown({ intentId, commandId: commandId || null, shopId: scope.shop.id, operation: op });
      }
      if (!alive()) throw new DOMException("Màn hình hoặc phạm vi đã đóng; kết quả chưa rõ được giữ để đối chiếu.", "AbortError");
      throw error2;
    } finally {
      inFlight.current = false;
      if (mounted.current && currentIdentity.current === identity) setPending(false);
      unsubscribe();
      options.signal?.removeEventListener("abort", cancel);
      controllers.current.delete(controller);
    }
  }, [cache, invalidate, op, scope, identity]);
  return {
    execute,
    pending,
    unresolved,
    error,
    clearError: () => setError(null),
    resetAfterReconcile: () => setError(null)
  };
}
function waitForPoll(ms, signal) {
  return new Promise((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      reject(new DOMException("Đã hủy kiểm tra lệnh.", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, ms);
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
  });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImhvb2tzLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZUNhbGxiYWNrLCB1c2VFZmZlY3QsIHVzZVJlZiwgdXNlU3RhdGUsIHVzZVN5bmNFeHRlcm5hbFN0b3JlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgdXNlSW5maW5pdGVRdWVyeSwgdXNlUXVlcnksIHVzZVF1ZXJ5Q2xpZW50IH0gZnJvbSAnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5JztcbmltcG9ydCB0eXBlIHsgSW5maW5pdGVEYXRhIH0gZnJvbSAnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5JztcbmltcG9ydCB0eXBlIHsgQ29tbWFuZFJlc3BvbnNlLCBPcGVyYXRpb25JZCwgUmVzcG9uc2VPZiB9IGZyb20gJ0Bib3RzYWxlcy9jb250cmFjdHMnO1xuaW1wb3J0IHsgb3BlcmF0aW9ucyB9IGZyb20gJ0Bib3RzYWxlcy9jb250cmFjdHMnO1xuaW1wb3J0IHsgcmVxdWVzdCwgc3Vic2NyaWJlU2NvcGVDYW5jZWxsYXRpb24gfSBmcm9tICcuL2NsaWVudCc7XG5pbXBvcnQgdHlwZSB7IEFwaUFyZ3VtZW50cywgQXBpT3B0aW9ucywgTXV0YXRpb25PcGVyYXRpb25JZCwgUXVlcnlBcGlPcHRpb25zLCBRdWVyeU9wZXJhdGlvbklkIH0gZnJvbSAnLi9jbGllbnQnO1xuaW1wb3J0IHsgQXBpRXJyb3IsIFVua25vd25SZXN1bHRFcnJvciB9IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCB7IHVzZVNjb3BlIH0gZnJvbSAnLi4vbW9kZWwvc2NvcGUnO1xuaW1wb3J0IHsgcmVtZW1iZXJVbmtub3duLCBoYXNVbmtub3duSW50ZW50LCBzdWJzY3JpYmVJbnRlbnRzLCBpbnRlbnRTbmFwc2hvdCB9IGZyb20gJy4vaW50ZW50cyc7XG5leHBvcnQgZnVuY3Rpb24gdXNlQXBpPEsgZXh0ZW5kcyBRdWVyeU9wZXJhdGlvbklkPihvcDogSywgb3B0aW9uczogT21pdDxRdWVyeUFwaU9wdGlvbnM8Sz4sICdzaWduYWwnPiA9IHt9LCBlbmFibGVkID0gdHJ1ZSkge1xuICAgIGNvbnN0IHNjb3BlID0gdXNlU2NvcGUoKTtcbiAgICBjb25zdCB7IHVzZXIgfSA9IHNjb3BlLnNlc3Npb247XG4gICAgY29uc3QgcGF0aCA9IHsgc2hvcElkOiBzY29wZS5zaG9wLmlkLCAuLi5vcHRpb25zLnBhdGggfTtcbiAgICBjb25zdCBxdWVyeSA9IG9wdGlvbnMucXVlcnkgfHwge307XG4gICAgcmV0dXJuIHVzZVF1ZXJ5PFJlc3BvbnNlT2Y8Sz4sIEVycm9yPih7XG4gICAgICAgIHF1ZXJ5S2V5OiBbJ3Njb3BlJywgdXNlci5pZCwgc2NvcGUuc2hvcC5pZCwgc2NvcGUubWVtYmVyc2hpcC5wZXJtaXNzaW9uVmVyc2lvbiwgb3AsIHBhdGgsIHF1ZXJ5XSxcbiAgICAgICAgcXVlcnlGbjogKHsgc2lnbmFsIH0pID0+IHJlcXVlc3Qob3AsIHsgLi4ub3B0aW9ucywgcGF0aCwgc2lnbmFsIH0pLFxuICAgICAgICBlbmFibGVkLCBzdGFsZVRpbWU6IDUwMDAsXG4gICAgICAgIHJldHJ5OiAoY291bnQsIGVycm9yKSA9PiBjb3VudCA8IDEgJiYgKCEoZXJyb3IgaW5zdGFuY2VvZiBBcGlFcnJvcikgfHwgZXJyb3Iuc3RhdHVzID49IDUwMCksXG4gICAgfSk7XG59XG5cbi8qKiBMb2FkcyBsb29rdXAgY2hvaWNlcyBpbiBib3VuZGVkIGN1cnNvciBwYWdlcyBhbmQgcmV0YWlucyBwcmlvciBwYWdlcyBmb3Igc2VsZWN0ZWQgdmFsdWVzLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVzZVBhZ2VkQXBpPEsgZXh0ZW5kcyBRdWVyeU9wZXJhdGlvbklkPihvcDogSywgb3B0aW9uczogT21pdDxRdWVyeUFwaU9wdGlvbnM8Sz4sICdzaWduYWwnPiA9IHt9LCBlbmFibGVkID0gdHJ1ZSkge1xuICAgIGNvbnN0IHNjb3BlID0gdXNlU2NvcGUoKTtcbiAgICBjb25zdCB7IHVzZXIgfSA9IHNjb3BlLnNlc3Npb247XG4gICAgY29uc3QgcGF0aCA9IHsgc2hvcElkOiBzY29wZS5zaG9wLmlkLCAuLi5vcHRpb25zLnBhdGggfTtcbiAgICBjb25zdCB7IGN1cnNvcjogX2N1cnNvciwgbGltaXQ6IHJlcXVlc3RlZExpbWl0LCAuLi5maWx0ZXJzIH0gPSAob3B0aW9ucy5xdWVyeSB8fCB7fSkgYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IHVuZGVmaW5lZD47XG4gICAgY29uc3QgbGltaXQgPSB0eXBlb2YgcmVxdWVzdGVkTGltaXQgPT09ICdudW1iZXInICYmIHJlcXVlc3RlZExpbWl0ID4gMCA/IE1hdGgubWluKHJlcXVlc3RlZExpbWl0LCAxMDApIDogMjA7XG4gICAgY29uc3QgcXVlcnkgPSB1c2VJbmZpbml0ZVF1ZXJ5PFJlc3BvbnNlT2Y8Sz4sIEVycm9yLCBJbmZpbml0ZURhdGE8UmVzcG9uc2VPZjxLPiwgc3RyaW5nIHwgdW5kZWZpbmVkPiwgcmVhZG9ubHkgdW5rbm93bltdLCBzdHJpbmcgfCB1bmRlZmluZWQ+KHtcbiAgICAgICAgcXVlcnlLZXk6IFsnc2NvcGUnLCB1c2VyLmlkLCBzY29wZS5zaG9wLmlkLCBzY29wZS5tZW1iZXJzaGlwLnBlcm1pc3Npb25WZXJzaW9uLCBvcCwgcGF0aCwgeyAuLi5maWx0ZXJzLCBsaW1pdCwgcGFnZWQ6IHRydWUgfV0sXG4gICAgICAgIGluaXRpYWxQYWdlUGFyYW06IHVuZGVmaW5lZCxcbiAgICAgICAgcXVlcnlGbjogKHsgc2lnbmFsLCBwYWdlUGFyYW0gfSkgPT4gcmVxdWVzdChvcCwgeyAuLi5vcHRpb25zLCBwYXRoLCBxdWVyeTogeyAuLi5maWx0ZXJzLCBsaW1pdCwgY3Vyc29yOiBwYWdlUGFyYW0gfSBhcyBRdWVyeUFwaU9wdGlvbnM8Sz5bJ3F1ZXJ5J10sIHNpZ25hbCB9KSxcbiAgICAgICAgZ2V0TmV4dFBhZ2VQYXJhbTogbGFzdFBhZ2UgPT4ge1xuICAgICAgICAgICAgY29uc3QgcGFnZSA9IChsYXN0UGFnZSBhcyB1bmtub3duIGFzIHsgcGFnZT86IHsgaGFzTW9yZTogYm9vbGVhbjsgbmV4dEN1cnNvcjogc3RyaW5nIHwgbnVsbCB9IH0pLnBhZ2U7XG4gICAgICAgICAgICByZXR1cm4gcGFnZT8uaGFzTW9yZSAmJiBwYWdlLm5leHRDdXJzb3IgPyBwYWdlLm5leHRDdXJzb3IgOiB1bmRlZmluZWQ7XG4gICAgICAgIH0sXG4gICAgICAgIGVuYWJsZWQsXG4gICAgICAgIHN0YWxlVGltZTogNTAwMCxcbiAgICAgICAgcmV0cnk6IChjb3VudCwgZXJyb3IpID0+IGNvdW50IDwgMSAmJiAoIShlcnJvciBpbnN0YW5jZW9mIEFwaUVycm9yKSB8fCBlcnJvci5zdGF0dXMgPj0gNTAwKSxcbiAgICB9KTtcbiAgICBjb25zdCBwYWdlcyA9IHF1ZXJ5LmRhdGE/LnBhZ2VzIHx8IFtdO1xuICAgIGNvbnN0IGxhc3RQYWdlID0gcGFnZXMuYXQoLTEpO1xuICAgIGNvbnN0IGRhdGEgPSBsYXN0UGFnZSA/IHtcbiAgICAgICAgLi4uKGxhc3RQYWdlIGFzIG9iamVjdCksXG4gICAgICAgIGRhdGE6IHBhZ2VzLmZsYXRNYXAocGFnZSA9PiAocGFnZSBhcyB1bmtub3duIGFzIHsgZGF0YTogdW5rbm93bltdIH0pLmRhdGEpLFxuICAgIH0gYXMgUmVzcG9uc2VPZjxLPiA6IHVuZGVmaW5lZDtcbiAgICByZXR1cm4ge1xuICAgICAgICAuLi5xdWVyeSxcbiAgICAgICAgZGF0YSxcbiAgICAgICAgbG9hZGVkQ291bnQ6IGRhdGEgPyAoKGRhdGEgYXMgdW5rbm93biBhcyB7IGRhdGE6IHVua25vd25bXSB9KS5kYXRhLmxlbmd0aCkgOiAwLFxuICAgICAgICBsb2FkTW9yZTogKCkgPT4gcXVlcnkuaGFzTmV4dFBhZ2UgPyBxdWVyeS5mZXRjaE5leHRQYWdlKCkgOiBQcm9taXNlLnJlc29sdmUodW5kZWZpbmVkKSxcbiAgICAgICAgaGFzTW9yZTogQm9vbGVhbihxdWVyeS5oYXNOZXh0UGFnZSksXG4gICAgICAgIGlzTG9hZGluZ01vcmU6IHF1ZXJ5LmlzRmV0Y2hpbmdOZXh0UGFnZSxcbiAgICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdXNlQ29tbWFuZDxLIGV4dGVuZHMgTXV0YXRpb25PcGVyYXRpb25JZD4ob3A6IEssIGludmFsaWRhdGU6IHJlYWRvbmx5IE9wZXJhdGlvbklkW10pIHtcbiAgICBjb25zdCBzY29wZSA9IHVzZVNjb3BlKCk7XG4gICAgY29uc3QgY2FjaGUgPSB1c2VRdWVyeUNsaWVudCgpO1xuICAgIGNvbnN0IFtwZW5kaW5nLCBzZXRQZW5kaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgICBjb25zdCBbZXJyb3IsIHNldEVycm9yXSA9IHVzZVN0YXRlPEVycm9yIHwgbnVsbD4obnVsbCk7XG4gICAgY29uc3QgaW5GbGlnaHQgPSB1c2VSZWYoZmFsc2UpO1xuICAgIGNvbnN0IGludGVudHMgPSB1c2VTeW5jRXh0ZXJuYWxTdG9yZShzdWJzY3JpYmVJbnRlbnRzLCBpbnRlbnRTbmFwc2hvdCwgaW50ZW50U25hcHNob3QpO1xuICAgIGNvbnN0IHVucmVzb2x2ZWQgPSBpbnRlbnRzLnNvbWUoaW50ZW50ID0+IGludGVudC5zaG9wSWQgPT09IHNjb3BlLnNob3AuaWQgJiYgaW50ZW50Lm9wZXJhdGlvbiA9PT0gb3ApO1xuICAgIGNvbnN0IG1vdW50ZWQgPSB1c2VSZWYoZmFsc2UpO1xuICAgIGNvbnN0IGNvbnRyb2xsZXJzID0gdXNlUmVmKG5ldyBTZXQ8QWJvcnRDb250cm9sbGVyPigpKTtcbiAgICBjb25zdCBpZGVudGl0eSA9IGAke3Njb3BlLnNlc3Npb24udXNlci5pZH06JHtzY29wZS5zaG9wLmlkfToke3Njb3BlLm1lbWJlcnNoaXAucGVybWlzc2lvblZlcnNpb259OiR7b3B9YDtcbiAgICBjb25zdCBjdXJyZW50SWRlbnRpdHkgPSB1c2VSZWYoaWRlbnRpdHkpO1xuICAgIGN1cnJlbnRJZGVudGl0eS5jdXJyZW50ID0gaWRlbnRpdHk7XG4gICAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICAgICAgbW91bnRlZC5jdXJyZW50ID0gdHJ1ZTtcbiAgICAgICAgY29uc3QgYWN0aXZlID0gY29udHJvbGxlcnMuY3VycmVudDtcbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICAgIG1vdW50ZWQuY3VycmVudCA9IGZhbHNlO1xuICAgICAgICAgICAgZm9yIChjb25zdCBjb250cm9sbGVyIG9mIGFjdGl2ZSkgY29udHJvbGxlci5hYm9ydCgpO1xuICAgICAgICAgICAgYWN0aXZlLmNsZWFyKCk7XG4gICAgICAgIH07XG4gICAgfSwgW2lkZW50aXR5XSk7XG4gICAgY29uc3QgZXhlY3V0ZSA9IHVzZUNhbGxiYWNrKGFzeW5jICguLi5hcmdzOiBBcGlBcmd1bWVudHM8Sz4pOiBQcm9taXNlPFJlc3BvbnNlT2Y8Sz4+ID0+IHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IChhcmdzWzBdID8/IHt9KSBhcyBBcGlPcHRpb25zPEs+O1xuICAgICAgICBpZiAoIW1vdW50ZWQuY3VycmVudCB8fCBjdXJyZW50SWRlbnRpdHkuY3VycmVudCAhPT0gaWRlbnRpdHkgfHwgb3B0aW9ucy5zaWduYWw/LmFib3J0ZWQpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRE9NRXhjZXB0aW9uKCdNw6BuIGjDrG5oIGhv4bq3YyBwaOG6oW0gdmkgxJHDoyDEkcOzbmcuJywgJ0Fib3J0RXJyb3InKTtcbiAgICAgICAgaWYgKGluRmxpZ2h0LmN1cnJlbnQgfHwgaGFzVW5rbm93bkludGVudChzY29wZS5zaG9wLmlkLCBvcCkpXG4gICAgICAgICAgICB0aHJvdyBuZXcgQXBpRXJyb3IoNDA5LCAnSU5fRkxJR0hUJywgJ1RoYW8gdMOhYyDEkWFuZyB44butIGzDvSBob+G6t2MgY2jGsGEgeMOhYyBtaW5oIGvhur90IHF14bqjLicpO1xuICAgICAgICBpZiAoIXNjb3BlLm9ubGluZSlcbiAgICAgICAgICAgIHRocm93IG5ldyBBcGlFcnJvcigwLCAnT0ZGTElORScsICfEkGFuZyBuZ2/huqFpIHR1eeG6v24uIEtow7RuZyBn4butaSB0aGF5IMSR4buVaS4nKTtcbiAgICAgICAgaW5GbGlnaHQuY3VycmVudCA9IHRydWU7XG4gICAgICAgIHNldFBlbmRpbmcodHJ1ZSk7XG4gICAgICAgIHNldEVycm9yKG51bGwpO1xuICAgICAgICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgICAgICBjb250cm9sbGVycy5jdXJyZW50LmFkZChjb250cm9sbGVyKTtcbiAgICAgICAgY29uc3QgY2FuY2VsID0gKCkgPT4gY29udHJvbGxlci5hYm9ydCgpO1xuICAgICAgICBjb25zdCB1bnN1YnNjcmliZSA9IHN1YnNjcmliZVNjb3BlQ2FuY2VsbGF0aW9uKGNhbmNlbCk7XG4gICAgICAgIG9wdGlvbnMuc2lnbmFsPy5hZGRFdmVudExpc3RlbmVyKCdhYm9ydCcsIGNhbmNlbCwgeyBvbmNlOiB0cnVlIH0pO1xuICAgICAgICBjb25zdCBhbGl2ZSA9ICgpID0+IG1vdW50ZWQuY3VycmVudCAmJiBjdXJyZW50SWRlbnRpdHkuY3VycmVudCA9PT0gaWRlbnRpdHkgJiYgIWNvbnRyb2xsZXIuc2lnbmFsLmFib3J0ZWQ7XG4gICAgICAgIGNvbnN0IGFzc2VydEFsaXZlID0gKCkgPT4geyBpZiAoIWFsaXZlKCkpIHRocm93IG5ldyBET01FeGNlcHRpb24oJ03DoG4gaMOsbmggaG/hurdjIHBo4bqhbSB2aSDEkcOjIMSRw7NuZy4nLCAnQWJvcnRFcnJvcicpOyB9O1xuICAgICAgICBjb25zdCBpbnRlbnRJZCA9IG9wdGlvbnMuaWRlbXBvdGVuY3lLZXkgfHwgY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgICAgICAgbGV0IGNvbW1hbmRJZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICBsZXQgdW5zZXR0bGVkID0gZmFsc2U7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBhc3NlcnRBbGl2ZSgpO1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVxdWVzdChvcCwgeyAuLi5vcHRpb25zLCBwYXRoOiB7IHNob3BJZDogc2NvcGUuc2hvcC5pZCwgLi4ub3B0aW9ucy5wYXRoIH0sIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsIGlkZW1wb3RlbmN5S2V5OiBpbnRlbnRJZCB9KTtcbiAgICAgICAgICAgIGxldCBzZXR0bGVkUmVzdWx0ID0gcmVzdWx0O1xuICAgICAgICAgICAgaWYgKG9wZXJhdGlvbnNbb3BdLnJlc3BvbnNlU2NoZW1hID09PSAnQ29tbWFuZFJlc3BvbnNlJyAmJiByZXN1bHQgJiYgdHlwZW9mIHJlc3VsdCA9PT0gJ29iamVjdCcgJiYgJ2RhdGEnIGluIHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbW1hbmQgPSByZXN1bHQuZGF0YTtcbiAgICAgICAgICAgICAgICBpZiAoY29tbWFuZCAmJiB0eXBlb2YgY29tbWFuZCA9PT0gJ29iamVjdCcgJiYgJ2lkJyBpbiBjb21tYW5kICYmIHR5cGVvZiBjb21tYW5kLmlkID09PSAnc3RyaW5nJyAmJiAnc3RhdHVzJyBpbiBjb21tYW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBvYnNlcnZlZCA9IGNvbW1hbmQuc3RhdHVzO1xuICAgICAgICAgICAgICAgICAgICBjb21tYW5kSWQgPSBjb21tYW5kLmlkO1xuICAgICAgICAgICAgICAgICAgICB1bnNldHRsZWQgPSBbJ2FjY2VwdGVkJywgJ3J1bm5pbmcnLCAndW5rbm93biddLmluY2x1ZGVzKFN0cmluZyhvYnNlcnZlZCkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAob2JzZXJ2ZWQgPT09ICdmYWlsZWQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEFwaUVycm9yKDQwOSwgJ0NPTU1BTkRfRkFJTEVEJywgJ0zhu4duaCBi4buLIHThu6sgY2jhu5FpOyB4ZW0ga+G6v3QgcXXhuqMga2nhu4NtIHRyYSBj4bunYSBiYWNrZW5kLicpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBhdHRlbXB0ID0gMDsgWydhY2NlcHRlZCcsICdydW5uaW5nJ10uaW5jbHVkZXMoU3RyaW5nKG9ic2VydmVkKSkgJiYgYXR0ZW1wdCA8IDg7IGF0dGVtcHQrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXJ0QWxpdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHdhaXRGb3JQb2xsKDQwMCArIGF0dGVtcHQgKiAxNTAsIGNvbnRyb2xsZXIuc2lnbmFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2VydEFsaXZlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY3VycmVudDogQ29tbWFuZFJlc3BvbnNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50ID0gYXdhaXQgcmVxdWVzdCgnZ2V0Q29tbWFuZCcsIHsgcGF0aDogeyBzaG9wSWQ6IHNjb3BlLnNob3AuaWQsIGNvbW1hbmRJZDogY29tbWFuZC5pZCB9LCBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBVbmtub3duUmVzdWx0RXJyb3IoaW50ZW50SWQsIGNvbW1hbmQuaWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZWQgPSBjdXJyZW50LmRhdGEuc3RhdHVzO1xuICAgICAgICAgICAgICAgICAgICAgICAgdW5zZXR0bGVkID0gWydhY2NlcHRlZCcsICdydW5uaW5nJywgJ3Vua25vd24nXS5pbmNsdWRlcyhTdHJpbmcob2JzZXJ2ZWQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldHRsZWRSZXN1bHQgPSBjdXJyZW50IGFzIFJlc3BvbnNlT2Y8Sz47XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAob2JzZXJ2ZWQgPT09ICdmYWlsZWQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBBcGlFcnJvcig0MDksIGN1cnJlbnQuZGF0YS5wcm9ibGVtPy5jb2RlIHx8ICdDT01NQU5EX0ZBSUxFRCcsIGN1cnJlbnQuZGF0YS5wcm9ibGVtPy5kZXRhaWwgfHwgJ0zhu4duaCBi4buLIHThu6sgY2jhu5FpLicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChbJ3Vua25vd24nLCAnYWNjZXB0ZWQnLCAncnVubmluZyddLmluY2x1ZGVzKFN0cmluZyhvYnNlcnZlZCkpKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IFVua25vd25SZXN1bHRFcnJvcihpbnRlbnRJZCwgY29tbWFuZC5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXNzZXJ0QWxpdmUoKTtcbiAgICAgICAgICAgIGF3YWl0IFByb21pc2UuYWxsKGludmFsaWRhdGUubWFwKGlkID0+IGNhY2hlLmludmFsaWRhdGVRdWVyaWVzKHsgcXVlcnlLZXk6IFsnc2NvcGUnLCBzY29wZS5zZXNzaW9uLnVzZXIuaWQsIHNjb3BlLnNob3AuaWQsIHNjb3BlLm1lbWJlcnNoaXAucGVybWlzc2lvblZlcnNpb24sIGlkXSB9KSkpO1xuICAgICAgICAgICAgYXNzZXJ0QWxpdmUoKTtcbiAgICAgICAgICAgIHJldHVybiBzZXR0bGVkUmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJvciA9IGUgaW5zdGFuY2VvZiBFcnJvciA/IGUgOiBuZXcgRXJyb3IoJ1nDqnUgY+G6p3UgdGjhuqV0IGLhuqFpJyk7XG4gICAgICAgICAgICBpZiAoYWxpdmUoKSkgc2V0RXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgVW5rbm93blJlc3VsdEVycm9yKSB7XG4gICAgICAgICAgICAgICAgcmVtZW1iZXJVbmtub3duKHsgaW50ZW50SWQ6IGVycm9yLmludGVudElkLCBjb21tYW5kSWQ6IGVycm9yLmNvbW1hbmRJZCB8fCBudWxsLCBzaG9wSWQ6IHNjb3BlLnNob3AuaWQsIG9wZXJhdGlvbjogb3AgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh1bnNldHRsZWQpIHtcbiAgICAgICAgICAgICAgICByZW1lbWJlclVua25vd24oeyBpbnRlbnRJZCwgY29tbWFuZElkOiBjb21tYW5kSWQgfHwgbnVsbCwgc2hvcElkOiBzY29wZS5zaG9wLmlkLCBvcGVyYXRpb246IG9wIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFhbGl2ZSgpKSB0aHJvdyBuZXcgRE9NRXhjZXB0aW9uKCdNw6BuIGjDrG5oIGhv4bq3YyBwaOG6oW0gdmkgxJHDoyDEkcOzbmc7IGvhur90IHF14bqjIGNoxrBhIHLDtSDEkcaw4bujYyBnaeG7ryDEkeG7gyDEkeG7kWkgY2hp4bq/dS4nLCAnQWJvcnRFcnJvcicpO1xuICAgICAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICAgIH1cbiAgICAgICAgZmluYWxseSB7XG4gICAgICAgICAgICBpbkZsaWdodC5jdXJyZW50ID0gZmFsc2U7XG4gICAgICAgICAgICBpZiAobW91bnRlZC5jdXJyZW50ICYmIGN1cnJlbnRJZGVudGl0eS5jdXJyZW50ID09PSBpZGVudGl0eSkgc2V0UGVuZGluZyhmYWxzZSk7XG4gICAgICAgICAgICB1bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgb3B0aW9ucy5zaWduYWw/LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Fib3J0JywgY2FuY2VsKTtcbiAgICAgICAgICAgIGNvbnRyb2xsZXJzLmN1cnJlbnQuZGVsZXRlKGNvbnRyb2xsZXIpO1xuICAgICAgICB9XG4gICAgfSwgW2NhY2hlLCBpbnZhbGlkYXRlLCBvcCwgc2NvcGUsIGlkZW50aXR5XSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZXhlY3V0ZSwgcGVuZGluZywgdW5yZXNvbHZlZCwgZXJyb3IsIGNsZWFyRXJyb3I6ICgpID0+IHNldEVycm9yKG51bGwpLCByZXNldEFmdGVyUmVjb25jaWxlOiAoKSA9PiBzZXRFcnJvcihudWxsKVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIHdhaXRGb3JQb2xsKG1zOiBudW1iZXIsIHNpZ25hbDogQWJvcnRTaWduYWwpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCBjYW5jZWwgPSAoKSA9PiB7IGNsZWFyVGltZW91dCh0aW1lcik7IHNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKCdhYm9ydCcsIGNhbmNlbCk7IHJlamVjdChuZXcgRE9NRXhjZXB0aW9uKCfEkMOjIGjhu6d5IGtp4buDbSB0cmEgbOG7h25oLicsICdBYm9ydEVycm9yJykpOyB9O1xuICAgICAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4geyBzaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignYWJvcnQnLCBjYW5jZWwpOyByZXNvbHZlKCk7IH0sIG1zKTtcbiAgICAgICAgc2lnbmFsLmFkZEV2ZW50TGlzdGVuZXIoJ2Fib3J0JywgY2FuY2VsLCB7IG9uY2U6IHRydWUgfSk7XG4gICAgICAgIGlmIChzaWduYWwuYWJvcnRlZCkgY2FuY2VsKCk7XG4gICAgfSk7XG59XG4iXSwibWFwcGluZ3MiOiJBQUFBLFNBQVMsYUFBYSxXQUFXLFFBQVEsVUFBVSw0QkFBNEI7QUFDL0UsU0FBUyxrQkFBa0IsVUFBVSxzQkFBc0I7QUFHM0QsU0FBUyxrQkFBa0I7QUFDM0IsU0FBUyxTQUFTLGtDQUFrQztBQUVwRCxTQUFTLFVBQVUsMEJBQTBCO0FBQzdDLFNBQVMsZ0JBQWdCO0FBQ3pCLFNBQVMsaUJBQWlCLGtCQUFrQixrQkFBa0Isc0JBQXNCO0FBQzdFLGdCQUFTLE9BQW1DLElBQU8sVUFBOEMsQ0FBQyxHQUFHLFVBQVUsTUFBTTtBQUN4SCxRQUFNLFFBQVEsU0FBUztBQUN2QixRQUFNLEVBQUUsS0FBSyxJQUFJLE1BQU07QUFDdkIsUUFBTSxPQUFPLEVBQUUsUUFBUSxNQUFNLEtBQUssSUFBSSxHQUFHLFFBQVEsS0FBSztBQUN0RCxRQUFNLFFBQVEsUUFBUSxTQUFTLENBQUM7QUFDaEMsU0FBTyxTQUErQjtBQUFBLElBQ2xDLFVBQVUsQ0FBQyxTQUFTLEtBQUssSUFBSSxNQUFNLEtBQUssSUFBSSxNQUFNLFdBQVcsbUJBQW1CLElBQUksTUFBTSxLQUFLO0FBQUEsSUFDL0YsU0FBUyxDQUFDLEVBQUUsT0FBTyxNQUFNLFFBQVEsSUFBSSxFQUFFLEdBQUcsU0FBUyxNQUFNLE9BQU8sQ0FBQztBQUFBLElBQ2pFO0FBQUEsSUFBUyxXQUFXO0FBQUEsSUFDcEIsT0FBTyxDQUFDLE9BQU8sVUFBVSxRQUFRLE1BQU0sRUFBRSxpQkFBaUIsYUFBYSxNQUFNLFVBQVU7QUFBQSxFQUMzRixDQUFDO0FBQ0w7QUFHTyxnQkFBUyxZQUF3QyxJQUFPLFVBQThDLENBQUMsR0FBRyxVQUFVLE1BQU07QUFDN0gsUUFBTSxRQUFRLFNBQVM7QUFDdkIsUUFBTSxFQUFFLEtBQUssSUFBSSxNQUFNO0FBQ3ZCLFFBQU0sT0FBTyxFQUFFLFFBQVEsTUFBTSxLQUFLLElBQUksR0FBRyxRQUFRLEtBQUs7QUFDdEQsUUFBTSxFQUFFLFFBQVEsU0FBUyxPQUFPLGdCQUFnQixHQUFHLFFBQVEsSUFBSyxRQUFRLFNBQVMsQ0FBQztBQUNsRixRQUFNLFFBQVEsT0FBTyxtQkFBbUIsWUFBWSxpQkFBaUIsSUFBSSxLQUFLLElBQUksZ0JBQWdCLEdBQUcsSUFBSTtBQUN6RyxRQUFNLFFBQVEsaUJBQWdJO0FBQUEsSUFDMUksVUFBVSxDQUFDLFNBQVMsS0FBSyxJQUFJLE1BQU0sS0FBSyxJQUFJLE1BQU0sV0FBVyxtQkFBbUIsSUFBSSxNQUFNLEVBQUUsR0FBRyxTQUFTLE9BQU8sT0FBTyxLQUFLLENBQUM7QUFBQSxJQUM1SCxrQkFBa0I7QUFBQSxJQUNsQixTQUFTLENBQUMsRUFBRSxRQUFRLFVBQVUsTUFBTSxRQUFRLElBQUksRUFBRSxHQUFHLFNBQVMsTUFBTSxPQUFPLEVBQUUsR0FBRyxTQUFTLE9BQU8sUUFBUSxVQUFVLEdBQWtDLE9BQU8sQ0FBQztBQUFBLElBQzVKLGtCQUFrQixDQUFBQSxjQUFZO0FBQzFCLFlBQU0sT0FBUUEsVUFBbUY7QUFDakcsYUFBTyxNQUFNLFdBQVcsS0FBSyxhQUFhLEtBQUssYUFBYTtBQUFBLElBQ2hFO0FBQUEsSUFDQTtBQUFBLElBQ0EsV0FBVztBQUFBLElBQ1gsT0FBTyxDQUFDLE9BQU8sVUFBVSxRQUFRLE1BQU0sRUFBRSxpQkFBaUIsYUFBYSxNQUFNLFVBQVU7QUFBQSxFQUMzRixDQUFDO0FBQ0QsUUFBTSxRQUFRLE1BQU0sTUFBTSxTQUFTLENBQUM7QUFDcEMsUUFBTSxXQUFXLE1BQU0sR0FBRyxFQUFFO0FBQzVCLFFBQU0sT0FBTyxXQUFXO0FBQUEsSUFDcEIsR0FBSTtBQUFBLElBQ0osTUFBTSxNQUFNLFFBQVEsVUFBUyxLQUF3QyxJQUFJO0FBQUEsRUFDN0UsSUFBcUI7QUFDckIsU0FBTztBQUFBLElBQ0gsR0FBRztBQUFBLElBQ0g7QUFBQSxJQUNBLGFBQWEsT0FBUyxLQUF3QyxLQUFLLFNBQVU7QUFBQSxJQUM3RSxVQUFVLE1BQU0sTUFBTSxjQUFjLE1BQU0sY0FBYyxJQUFJLFFBQVEsUUFBUSxNQUFTO0FBQUEsSUFDckYsU0FBUyxRQUFRLE1BQU0sV0FBVztBQUFBLElBQ2xDLGVBQWUsTUFBTTtBQUFBLEVBQ3pCO0FBQ0o7QUFFTyxnQkFBUyxXQUEwQyxJQUFPLFlBQW9DO0FBQ2pHLFFBQU0sUUFBUSxTQUFTO0FBQ3ZCLFFBQU0sUUFBUSxlQUFlO0FBQzdCLFFBQU0sQ0FBQyxTQUFTLFVBQVUsSUFBSSxTQUFTLEtBQUs7QUFDNUMsUUFBTSxDQUFDLE9BQU8sUUFBUSxJQUFJLFNBQXVCLElBQUk7QUFDckQsUUFBTSxXQUFXLE9BQU8sS0FBSztBQUM3QixRQUFNLFVBQVUscUJBQXFCLGtCQUFrQixnQkFBZ0IsY0FBYztBQUNyRixRQUFNLGFBQWEsUUFBUSxLQUFLLFlBQVUsT0FBTyxXQUFXLE1BQU0sS0FBSyxNQUFNLE9BQU8sY0FBYyxFQUFFO0FBQ3BHLFFBQU0sVUFBVSxPQUFPLEtBQUs7QUFDNUIsUUFBTSxjQUFjLE9BQU8sb0JBQUksSUFBcUIsQ0FBQztBQUNyRCxRQUFNLFdBQVcsR0FBRyxNQUFNLFFBQVEsS0FBSyxFQUFFLElBQUksTUFBTSxLQUFLLEVBQUUsSUFBSSxNQUFNLFdBQVcsaUJBQWlCLElBQUksRUFBRTtBQUN0RyxRQUFNLGtCQUFrQixPQUFPLFFBQVE7QUFDdkMsa0JBQWdCLFVBQVU7QUFDMUIsWUFBVSxNQUFNO0FBQ1osWUFBUSxVQUFVO0FBQ2xCLFVBQU0sU0FBUyxZQUFZO0FBQzNCLFdBQU8sTUFBTTtBQUNULGNBQVEsVUFBVTtBQUNsQixpQkFBVyxjQUFjLE9BQVEsWUFBVyxNQUFNO0FBQ2xELGFBQU8sTUFBTTtBQUFBLElBQ2pCO0FBQUEsRUFDSixHQUFHLENBQUMsUUFBUSxDQUFDO0FBQ2IsUUFBTSxVQUFVLFlBQVksVUFBVSxTQUFrRDtBQUNwRixVQUFNLFVBQVcsS0FBSyxDQUFDLEtBQUssQ0FBQztBQUM3QixRQUFJLENBQUMsUUFBUSxXQUFXLGdCQUFnQixZQUFZLFlBQVksUUFBUSxRQUFRO0FBQzVFLFlBQU0sSUFBSSxhQUFhLGtDQUFrQyxZQUFZO0FBQ3pFLFFBQUksU0FBUyxXQUFXLGlCQUFpQixNQUFNLEtBQUssSUFBSSxFQUFFO0FBQ3RELFlBQU0sSUFBSSxTQUFTLEtBQUssYUFBYSxpREFBaUQ7QUFDMUYsUUFBSSxDQUFDLE1BQU07QUFDUCxZQUFNLElBQUksU0FBUyxHQUFHLFdBQVcsdUNBQXVDO0FBQzVFLGFBQVMsVUFBVTtBQUNuQixlQUFXLElBQUk7QUFDZixhQUFTLElBQUk7QUFDYixVQUFNLGFBQWEsSUFBSSxnQkFBZ0I7QUFDdkMsZ0JBQVksUUFBUSxJQUFJLFVBQVU7QUFDbEMsVUFBTSxTQUFTLE1BQU0sV0FBVyxNQUFNO0FBQ3RDLFVBQU0sY0FBYywyQkFBMkIsTUFBTTtBQUNyRCxZQUFRLFFBQVEsaUJBQWlCLFNBQVMsUUFBUSxFQUFFLE1BQU0sS0FBSyxDQUFDO0FBQ2hFLFVBQU0sUUFBUSxNQUFNLFFBQVEsV0FBVyxnQkFBZ0IsWUFBWSxZQUFZLENBQUMsV0FBVyxPQUFPO0FBQ2xHLFVBQU0sY0FBYyxNQUFNO0FBQUUsVUFBSSxDQUFDLE1BQU0sRUFBRyxPQUFNLElBQUksYUFBYSxrQ0FBa0MsWUFBWTtBQUFBLElBQUc7QUFDbEgsVUFBTSxXQUFXLFFBQVEsa0JBQWtCLE9BQU8sV0FBVztBQUM3RCxRQUFJO0FBQ0osUUFBSSxZQUFZO0FBQ2hCLFFBQUk7QUFDQSxrQkFBWTtBQUNaLFlBQU0sU0FBUyxNQUFNLFFBQVEsSUFBSSxFQUFFLEdBQUcsU0FBUyxNQUFNLEVBQUUsUUFBUSxNQUFNLEtBQUssSUFBSSxHQUFHLFFBQVEsS0FBSyxHQUFHLFFBQVEsV0FBVyxRQUFRLGdCQUFnQixTQUFTLENBQUM7QUFDdEosVUFBSSxnQkFBZ0I7QUFDcEIsVUFBSSxXQUFXLEVBQUUsRUFBRSxtQkFBbUIscUJBQXFCLFVBQVUsT0FBTyxXQUFXLFlBQVksVUFBVSxRQUFRO0FBQ2pILGNBQU0sVUFBVSxPQUFPO0FBQ3ZCLFlBQUksV0FBVyxPQUFPLFlBQVksWUFBWSxRQUFRLFdBQVcsT0FBTyxRQUFRLE9BQU8sWUFBWSxZQUFZLFNBQVM7QUFDcEgsY0FBSSxXQUFXLFFBQVE7QUFDdkIsc0JBQVksUUFBUTtBQUNwQixzQkFBWSxDQUFDLFlBQVksV0FBVyxTQUFTLEVBQUUsU0FBUyxPQUFPLFFBQVEsQ0FBQztBQUN4RSxjQUFJLGFBQWE7QUFDYixrQkFBTSxJQUFJLFNBQVMsS0FBSyxrQkFBa0Isb0RBQW9EO0FBQ2xHLG1CQUFTLFVBQVUsR0FBRyxDQUFDLFlBQVksU0FBUyxFQUFFLFNBQVMsT0FBTyxRQUFRLENBQUMsS0FBSyxVQUFVLEdBQUcsV0FBVztBQUNoRyx3QkFBWTtBQUNaLGtCQUFNLFlBQVksTUFBTSxVQUFVLEtBQUssV0FBVyxNQUFNO0FBQ3hELHdCQUFZO0FBQ1osZ0JBQUk7QUFDSixnQkFBSTtBQUNBLHdCQUFVLE1BQU0sUUFBUSxjQUFjLEVBQUUsTUFBTSxFQUFFLFFBQVEsTUFBTSxLQUFLLElBQUksV0FBVyxRQUFRLEdBQUcsR0FBRyxRQUFRLFdBQVcsT0FBTyxDQUFDO0FBQUEsWUFDL0gsUUFDTTtBQUNGLG9CQUFNLElBQUksbUJBQW1CLFVBQVUsUUFBUSxFQUFFO0FBQUEsWUFDckQ7QUFDQSx1QkFBVyxRQUFRLEtBQUs7QUFDeEIsd0JBQVksQ0FBQyxZQUFZLFdBQVcsU0FBUyxFQUFFLFNBQVMsT0FBTyxRQUFRLENBQUM7QUFDeEUsNEJBQWdCO0FBQ2hCLGdCQUFJLGFBQWE7QUFDYixvQkFBTSxJQUFJLFNBQVMsS0FBSyxRQUFRLEtBQUssU0FBUyxRQUFRLGtCQUFrQixRQUFRLEtBQUssU0FBUyxVQUFVLGtCQUFrQjtBQUFBLFVBQ2xJO0FBQ0EsY0FBSSxDQUFDLFdBQVcsWUFBWSxTQUFTLEVBQUUsU0FBUyxPQUFPLFFBQVEsQ0FBQztBQUM1RCxrQkFBTSxJQUFJLG1CQUFtQixVQUFVLFFBQVEsRUFBRTtBQUFBLFFBQ3pEO0FBQUEsTUFDSjtBQUNBLGtCQUFZO0FBQ1osWUFBTSxRQUFRLElBQUksV0FBVyxJQUFJLFFBQU0sTUFBTSxrQkFBa0IsRUFBRSxVQUFVLENBQUMsU0FBUyxNQUFNLFFBQVEsS0FBSyxJQUFJLE1BQU0sS0FBSyxJQUFJLE1BQU0sV0FBVyxtQkFBbUIsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3RLLGtCQUFZO0FBQ1osYUFBTztBQUFBLElBQ1gsU0FDTyxHQUFHO0FBQ04sWUFBTUMsU0FBUSxhQUFhLFFBQVEsSUFBSSxJQUFJLE1BQU0sa0JBQWtCO0FBQ25FLFVBQUksTUFBTSxFQUFHLFVBQVNBLE1BQUs7QUFDM0IsVUFBSUEsa0JBQWlCLG9CQUFvQjtBQUNyQyx3QkFBZ0IsRUFBRSxVQUFVQSxPQUFNLFVBQVUsV0FBV0EsT0FBTSxhQUFhLE1BQU0sUUFBUSxNQUFNLEtBQUssSUFBSSxXQUFXLEdBQUcsQ0FBQztBQUFBLE1BQzFILFdBQ1MsV0FBVztBQUNoQix3QkFBZ0IsRUFBRSxVQUFVLFdBQVcsYUFBYSxNQUFNLFFBQVEsTUFBTSxLQUFLLElBQUksV0FBVyxHQUFHLENBQUM7QUFBQSxNQUNwRztBQUNBLFVBQUksQ0FBQyxNQUFNLEVBQUcsT0FBTSxJQUFJLGFBQWEseUVBQXlFLFlBQVk7QUFDMUgsWUFBTUE7QUFBQSxJQUNWLFVBQ0E7QUFDSSxlQUFTLFVBQVU7QUFDbkIsVUFBSSxRQUFRLFdBQVcsZ0JBQWdCLFlBQVksU0FBVSxZQUFXLEtBQUs7QUFDN0Usa0JBQVk7QUFDWixjQUFRLFFBQVEsb0JBQW9CLFNBQVMsTUFBTTtBQUNuRCxrQkFBWSxRQUFRLE9BQU8sVUFBVTtBQUFBLElBQ3pDO0FBQUEsRUFDSixHQUFHLENBQUMsT0FBTyxZQUFZLElBQUksT0FBTyxRQUFRLENBQUM7QUFDM0MsU0FBTztBQUFBLElBQ0g7QUFBQSxJQUFTO0FBQUEsSUFBUztBQUFBLElBQVk7QUFBQSxJQUFPLFlBQVksTUFBTSxTQUFTLElBQUk7QUFBQSxJQUFHLHFCQUFxQixNQUFNLFNBQVMsSUFBSTtBQUFBLEVBQ25IO0FBQ0o7QUFFQSxTQUFTLFlBQVksSUFBWSxRQUFxQjtBQUNsRCxTQUFPLElBQUksUUFBYyxDQUFDLFNBQVMsV0FBVztBQUMxQyxVQUFNLFNBQVMsTUFBTTtBQUFFLG1CQUFhLEtBQUs7QUFBRyxhQUFPLG9CQUFvQixTQUFTLE1BQU07QUFBRyxhQUFPLElBQUksYUFBYSx5QkFBeUIsWUFBWSxDQUFDO0FBQUEsSUFBRztBQUMxSixVQUFNLFFBQVEsV0FBVyxNQUFNO0FBQUUsYUFBTyxvQkFBb0IsU0FBUyxNQUFNO0FBQUcsY0FBUTtBQUFBLElBQUcsR0FBRyxFQUFFO0FBQzlGLFdBQU8saUJBQWlCLFNBQVMsUUFBUSxFQUFFLE1BQU0sS0FBSyxDQUFDO0FBQ3ZELFFBQUksT0FBTyxRQUFTLFFBQU87QUFBQSxFQUMvQixDQUFDO0FBQ0w7IiwibmFtZXMiOlsibGFzdFBhZ2UiLCJlcnJvciJdfQ==