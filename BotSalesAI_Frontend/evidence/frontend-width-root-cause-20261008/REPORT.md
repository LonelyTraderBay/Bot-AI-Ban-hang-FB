# Phân tích gốc rễ: nhiều trang trông như chỉ hiển thị một nửa

Ngày kiểm tra: 08/10/2026. Phạm vi: React/TypeScript và bản `dist-demo` với API MSW tổng hợp.

**Kết luận:** ảnh người dùng là R30 — **Nhà cung cấp AI**, đường dẫn `/s/shop-demo/integrations/ai`. Card đang nằm trong cột đầu của grid hai cột dù dataset chỉ có một kết nối. Khoảng bên phải là track CSS còn trống. Ngoài nguyên nhân này, các trang form có giới hạn width và một thông báo nằm sai phạm vi grid cũng tạo hình ảnh tương tự. Không thể sửa mọi trường hợp bằng một override width chung.

**Trạng thái công việc:** phân tích đã kiểm chứng; các phát hiện mới bên dưới chưa sửa source sản phẩm. Tài liệu này là evidence của lần phân tích, không thay thế kế hoạch UI hiện hành hoặc tự tăng tỷ lệ nghiệm thu.

## 1. Bằng chứng và giới hạn

- Source: HEAD `53c0ba8f413b1f1e0fa16a747ed27f728b861dd6` cùng working tree đang có thay đổi. HEAD đơn lẻ không đại diện toàn source đã đo.
- Kiểm kê AST trên đủ **16 module**: **14 placement SectionGrid trong module + 1 trong shared DraftConflict = 15**. Ngoài ra đọc 5 consumer Stats và grid hai vùng riêng của Dashboard.
- Đo bản compiled trên **54 route × 2 engine = 108 lượt** tại viewport **1920×1000**. Các detail route dùng ID mẫu; R36 dùng `missing-job` để quan sát state của route, không suy thành job thành công.
- R30 kiểm thêm **9 state/viewport mỗi engine**, tổng **18 lượt**: một kết nối ở 320, 768, 1279, 1280, 1440, 1920 px; hai và ba kết nối tại 1920 px; danh sách rỗng tại 1920 px.
- Hai thử nghiệm DOM tạm thời chuyển grid R30 sang một cột; reload phục hồi source compiled. Đây là phép kiểm nguyên nhân, chưa phải bản sửa.
- Browser contexts và preview đều độc lập. Dữ liệu tạo thêm chỉ là kết nối mock với credential `demo-…`, không gọi provider thật hoặc thay dữ liệu trên tab người dùng.
- Không có page error trong hai engine; không có document overflow ngang trong 108 lượt seed ở 1920 px. Điều này không chứng minh mọi giá trị dài, zoom hay state khác đều không bị cắt bên trong component.
- 77 fingerprint source/input và toàn bộ demo artifacts giữ nguyên trước/sau phép đo. Đối chiếu với hồ sơ source cuối trước đó: **82 file runtime/contracts và 39 file demo khớp**, drift bằng 0.
- Chưa chạy lại full regression, axe, native zoom hoặc screen-reader speech trong lần phân tích này. Không dùng số lượt đo layout làm số test nghiệm thu.

Nguồn thô: [measurements.json](./measurements.json), [source inventory](./source-inventory.json), [provenance](./provenance.json), [probe log](./probe.log). Hai attempt chẩn đoán chưa hoàn tất được giữ tại `historical-attempt-01/` và `historical-attempt-02/`: lần đầu selector combobox quá chặt; lần hai chuyển route khi query AI còn fresh trong cache. Lần cuối bắt đầu empty case từ bootstrap mới trên Overview để query AI đầu tiên đọc đúng mock fault, hoàn tất với exit 0.

## 2. W01 — R30 chọn cố định hai cột cho danh sách chỉ có một card

**Ưu tiên P1; lỗi composition đã tái hiện đúng ảnh.**

### Chuỗi nguyên nhân

1. [AIProvidersPage](../../apps/web/src/modules/integrations/index.tsx), dòng 42, luôn truyền `columns={{ xs: '1fr', lg: '1fr 1fr' }}`.
2. Trang chỉ kiểm `length === 0` để chọn Empty. Mọi danh sách không rỗng đều đi qua cùng grid hai cột; không có quyết định riêng cho một item.
3. [SectionGrid](../../apps/web/src/shared/ui/composition.tsx), dòng 65–74, nhận geometry từ consumer rồi forward thành `gridTemplateColumns`. Component sở hữu gap; không có quy tắc đọc số record để đổi cột. Cột CSS đã khai báo vẫn tồn tại khi không có card thứ hai.
4. Panel không có `gridColumn` để span cả hàng; CSS auto-placement đưa card đầu vào ô đầu.
5. [Shell](../../apps/web/src/app/Shell.tsx), dòng 116–124, vẫn fill main; [layout owner](../../apps/web/src/shared/ui/layout.ts) giữ gutter 24 px và grid gap 24 px. Panel nhận width của track, không phải width toàn main.

### Số đo ở cả Chromium và Firefox

| Viewport | Content main | Grid computed | Card duy nhất | Tỷ lệ card/main |
|---:|---:|---|---:|---:|
| 320 | 288 | 288 px | 288 | 100% |
| 768 | 720 | 720 px | 720 | 100% |
| 1279 | 1231 | 1231 px | 1231 | 100% |
| 1280 | 992 | 484 + 484 px, gap 24 | 484 | 48,8% |
| 1440 | 1152 | 564 + 564 px, gap 24 | 564 | 49,0% |
| 1920 | 1632 | 804 + 804 px, gap 24 | 804 | 49,3% |

Tại 1920 px: `(1920 − sidebar 240 − gutter 48 − gap 24) / 2 = 804`.

Chỉ thay `gridTemplateColumns` thành `minmax(0, 1fr)` trong DOM, giữ nguyên card/data/shell: card đổi **804 → 1632 px** trong cả hai engine. Đây là kiểm chứng trực tiếp rằng geometry của grid tạo khoảng trống.

Hai kết nối lấp hai ô. Ba kết nối giữ hai cột và card thứ ba nằm ở ô trái hàng sau. Empty case hiển thị shared Empty, không có SectionGrid. Hành vi hàng cuối của danh sách lẻ phải được chốt trong contract; không tự xem mọi ô trống cuối collection là mất dữ liệu.

### Breakpoint khuếch đại cảm giác co hẹp

[Theme](../../apps/web/src/shared/ui/theme.ts), dòng 19, đặt desktop `lg/xl=1280`. Cùng ngưỡng đó, Shell thêm sidebar 240 px và R30 bật hai cột. Vì vậy tăng viewport chỉ 1 px, từ 1279 sang 1280, làm card đơn lẻ giảm **1231 → 484 px**. Đây là kết quả phối hợp hai quyết định responsive hiện hành; cần xét width còn lại của main khi thiết kế cột.

### Cách sửa đề xuất

Giữ lựa chọn số record tại consumer nghiệp vụ và dùng API SectionGrid hiện có: 0 → Empty; 1 → một cột đầy vùng collection đã chốt; nhiều item → grid responsive với track có thể shrink bằng `minmax(0, 1fr)`. Không suy số item từ React.Children của mọi grid vì pane, Fragment, điều kiện và dialog portal có semantics khác collection.

## 3. W02 — form hẹp nằm trong panel rộng toàn trang

**Ưu tiên P2; hình học đã xác nhận, cần chốt composition theo profile form.**

| Route | Owner giới hạn width | Form/body ở 1920 px | Panel | Tỷ lệ body/main |
|---|---|---:|---:|---:|
| R13 — Nhập dữ liệu sản phẩm | [imports.tsx](../../apps/web/src/modules/catalog/imports.tsx), dòng 34: Box `maxWidth:850` | 850 | 1632 | 52,1% |
| R33 — Thiết lập cửa hàng | [workspace/index.tsx](../../apps/web/src/modules/workspace/index.tsx), dòng 110: FormFields `maxWidth:760` | 760 | 1632 | 46,6% |
| R42 — Vận đơn & giao hàng | [fulfillment/index.tsx](../../apps/web/src/modules/fulfillment/index.tsx), dòng 358: FormFields `maxWidth:760` | 760 | 1632 | 46,6% |

Hai engine cùng kết quả. Ba trang này tạo khoảng trống **bên trong panel**, khác R30 tạo khoảng trống **ngoài card**.

Chuẩn hiện hành §13.3 cho phép giới hạn width tại form container để giữ dòng dễ đọc; bản thân con số max-width chưa đủ để kết luận là lỗi functionality. Vấn đề cần xử lý là quan hệ width giữa panel/header/body trên màn hình rộng và rationale trong contract. R31 cũng có form max-width 760 nhưng vùng phải đã chứa panel “Phạm vi dữ liệu”, nên không thuộc trường hợp bỏ trống nửa trang.

Đề xuất chốt một composition rõ cho mỗi form: surface và body dùng cùng phạm vi đọc, hoặc form theo các nhóm cột có ý nghĩa. Với trang có bảng rộng bên dưới, chỉ điều chỉnh vùng form. Không thêm trường hay dữ liệu giả để lấp khoảng trống.

Ảnh: [R13](./R13-chromium-1920.png), [R33](./R33-chromium-1920.png), [R42](./R42-chromium-1920.png).

## 4. W03 — thông báo toàn trang rơi vào một ô của grid

**Ưu tiên P2; vị trí và width đã xác nhận.**

[DevicesPage](../../apps/web/src/modules/notifications/index.tsx), dòng 115 trở đi, đặt hai vùng chính và Alert `notification-protection-note` làm ba direct children của grid `1.2fr 1fr`. Alert thứ ba không span hai cột nên auto-placement đặt nó ở ô trái hàng thứ hai.

Tại 1920 px: main 1632; hai cột **877,08 + 730,91**, gap 24; Alert rộng **877,08 px**, khoảng 53,7% main. Firefox có sai số dưới 0,02 px. Hai vùng chính vẫn có nội dung; riêng thông báo về cơ chế bảo vệ notification chỉ chiếm nửa hàng.

Đề xuất đưa notice ra flow toàn chiều rộng sau grid hai pane, hoặc dùng geometry span toàn grid nếu contract xác định nó là một hàng trong grid. Giữ inset/gap do shared owner và không đổi behavior thông báo.

## 5. W04 — Fragment DetailLine làm nhịp các dòng AI bị tăng

**Ưu tiên P2; ảnh hưởng mật độ dọc, không tạo cột trống ngang.**

[DetailLine](../../apps/web/src/shared/ui/components.tsx), dòng 469–472, trả Fragment gồm `Stack` và `Divider`: một row nghiệp vụ tạo **hai DOM siblings**. R30 map các DetailLine vào SurfaceContent có gap 12. Gap được áp cả row→divider và divider→row tiếp theo.

Ở R30 desktop: row cao **45 px**, divider **1 px**, khoảng cách top giữa hai row liền nhau **70 px = 45 + 12 + 1 + 12**. Bảy capability rows tạo 14 DOM children và vùng cao **478 px**. Các DetailLine metadata nằm trong Box không có gap parent nên chỉ cộng row + divider. Điều này giải thích vì sao phần capabilities trong ảnh thưa hơn metadata phía trên dù dùng cùng DetailLine.

98 JSX call-site DetailLine được tìm thấy trong source. Trước khi sửa shared owner cần import/route impact đầy đủ; không suy mọi consumer đều bị cùng độ giãn. Cách xử lý nên làm row+divider thành một slot nghiệp vụ rõ hoặc chọn composition phù hợp, rồi đo lại cả nơi có gap và không có gap. Đây chưa phải thay đổi đã triển khai.

## 6. Phạm vi cùng pattern và các bố cục cần giữ semantics

| Owner/route | Cấu trúc đã đọc/đo | Kết luận lần này |
|---|---|---|
| R30 AIProvidersPage | Danh sách động; seed 1; fixed 2 columns desktop | W01 xác nhận |
| R02 WorkspacesPage | Danh sách shop động; fixed 2 columns từ 768; seed 2 | Cùng nguyên nhân nếu chỉ có 1 shop. Chưa đưa fixture 1 shop vào browser lần này; không gọi là lỗi đã tái hiện tại seed |
| R51 AgentTeamPage | Role collection, seed 4; 2 columns | Seed lấp đủ hai hàng. Nếu payload role thưa, phải chốt semantics role thiếu trước khi đổi cột |
| R04 role grid | 4 role cards, 4 columns desktop | Seed đủ 4. Không tự đổi cách thể hiện bốn vai trò nghiệp vụ |
| R05/R06 Inbox | Conversation list + detail; thread + context | Hai vùng thật. Không áp quy tắc one-card lên pane |
| R08 CustomerPage | Thông tin khách + các vùng liên quan | Hai vùng thật |
| R19 OrderDetailPage | Dòng đơn + thông tin xử lý | Hai vùng thật |
| R27 PlaygroundPage | Câu hỏi + kết quả | Hai vùng thật, pane kết quả có state trước khi chạy |
| R31 ReportsPage | Báo cáo + phạm vi dữ liệu | Hai vùng thật; form có giới hạn đọc trong pane |
| R35 PrivacyPage | Chính sách + yêu cầu khách | Hai vùng thật |
| R40 DevicesPage | Hai vùng + notice thứ ba | W03 xác nhận ở notice |
| R52 DigestsPage | Bản tin + sức khỏe phụ thuộc | Hai vùng thật |
| R53 MarketingPage | Câu hỏi + lý do không chốt | Hai vùng thật |
| shared DraftConflict | Bản gốc / nháp / server | Ba snapshot cố định. Chỉ kiểm source trong lần này; không mở dialog để gọi runtime regression PASS |
| 5 Stats consumers | R04/R20/R22/R37/R53; mỗi nơi khai báo 4 Stat | Không có collection một item tại các caller hiện hành; không tự sửa Stats theo finding R30 |
| Dashboard grid riêng | Vùng hoạt động + tài chính | Hai vùng thật; source audit cùng 15 SectionGrid placements |

Các trường hợp login/setup surface hẹp căn giữa, subtitle giới hạn dòng và bong bóng Inbox max-width 88% có mục đích riêng. Width nhỏ không đủ để kết luận lỗi; cần xét nội dung, align và profile.

## 7. Vì sao các gate trước chưa bắt lỗi này

- [ui-integrations-layout.spec.ts](../../tests/ui-integrations-layout.spec.ts), dòng 26–53: kiểm document không tràn ở 320/390/768/1280/1440 và dialog nằm trong viewport. Card chiếm 49% vẫn thỏa các assertion đó.
- [ui-composition-layout.spec.ts](../../tests/ui-composition-layout.spec.ts), dòng 33–58: kiểm gap, child margin, main inset và page overflow. Không so width occupied/available với ý nghĩa “collection có một item”.
- [shared API contract](../../tests/ui-shared-api-contract.test.mjs) khóa loại prop/breakpoint và provenance; không phải tiêu chí thẩm mỹ cho mọi cardinality.
- Chuẩn SPC-048/057/061 yêu cầu review profile, responsive và consumer impact. Contract/coverage của các grid hiện tại chưa chuyển sparse-state width và full-row notice thành tiêu chí đo bắt buộc. Token/gap đúng vẫn có thể đi cùng bố cục tạo nhiều whitespace.

Các kết quả verify/full E2E trước giữ nguyên ý nghĩa của assertion đã chạy. Finding mới cho thấy coverage còn thiếu cho tiêu chí người dùng đang nêu; không suy từ các gate đó rằng mọi bố cục đã đạt yêu cầu thị giác.

## 8. Thứ tự xử lý và điều kiện đóng đề xuất

1. **P1 — W01 + hai consumer collection động:** ghi contract 0/1/2/3 item, sửa cột theo số record tại owner thực; browser regression đo card/main, vị trí item, width sau thay đổi query/scope. R02 phải có fixture 1 shop đúng schema; role grid chỉ thay khi semantics role thiếu đã xác định.
2. **P2 — W02/W03:** chốt phạm vi form surface và full-row notice; kiểm các route bị tác động, không ép pane nghiệp vụ thành một cột toàn trang.
3. **P2 — W04:** kiểm import/route impact của DetailLine, chốt atomic DOM slot và nhịp divider; regression so cùng nội dung trong gap parent và plain container.
4. **Gate bảo vệ:** thêm assertion tại suite sở hữu cho 1279/1280/1440/1920 và mobile; empty/single/multiple; dài/null/permission/refetch; kiểm keyboard/axe/reflow/native zoom theo impact. So logical item, không chỉ DOM node count.
5. Sau sửa source, cập nhật nguồn kế hoạch UI hiện hành, chạy gates và sinh evidence trên source cuối. Không dùng hai counterfactual DOM hay bản phân tích này để đóng task sửa.

Lệnh tái lập đo (từ Frontend workspace, dùng Node đã cài):

```powershell
& 'C:\Program Files\nodejs\node.exe' evidence/frontend-width-root-cause-20261008/inspect-width.mjs
& 'C:\Program Files\nodejs\node.exe' evidence/frontend-width-root-cause-20261008/verify-provenance.mjs
```

Probe tạo preview port tạm, đóng preview và browser của chính nó. Nếu chạy lại, lưu bản measurements/log hiện tại thành lịch sử trước; không gộp các attempt chưa hoàn tất thành một full regression PASS.
