# S05 — acceptance của binding capability

Scope: source provenance/identity cho ba UI gates; không UI/behavior/Enterprise certification. Không đổi runtime app, theme/layout values, mock/data behavior hoặc generated outputs. Full goal S06–S20 vẫn mở.

| Điều kiện S05 | Bằng chứng thực | Giới hạn |
|---|---|---|
| P01: MUI local aliases | Production layout rejects const alias gap99; composition rejects alias +canonical role | Wrapper/render ancestry ở S09 |
| P02: renamed styled | Genuine MUI renamed factory và Emotion css tag bị quét; namespace factory opaque strict UNKNOWN | Style-entry/value coverage đầy đủ ở S07/S08 |
| P08: shadow | Canonical layout/tokens import shadow, global value/geometry alias shadow, typed semantic parameter shadow, private factor shadow đều không thừa hưởng trust | Readonly/mutations khác binding, ở S06 |
| P19: fake canonical names/path suffix | Fake visual file và pretrusted colors/tokens names bị visual gate báo lỗi; foreign dependency cannot become MUI via tsconfig alias | Canonical CSS variable/units/values ở S08 |
| P20: barrel exports | Canonical shared barrel alias positive; illegal props negative; genuine MUI re-export keeps identity and raw spacing fails | All slots/finite APIs/values ở S10 |
| Positive invariants | Const aliases, namespace, literal/constant-key element access, destructuring, safe type syntax, JavaScript worker; genuine RHF alias/ref/name/event forwarding paths giữ được | Full form/browser behavior ở S07/S12/S16/S19 |
| UNKNOWN/config failures | Opaque component/factory access remains strict failure; missing config preserves parse diagnostics with binding error, no lexical fallback | Unknown syntax/value paths tiếp tục harden đúng step |
| Project scope/boundaries/compiler/generator | Actual commands/exits0 và hashes tại S05-status.json; file lists75/75/74 khớp S04, missing/extra=[] | Discovery không rendered branch proof |

[Fixtures118/118](S05-binding-acceptance-fixtures.log), exit0/no skips. Final private-owner change có [targeted24/24](S05-owner-binding-final.log) trên source sau đổi cssPixel binding; không cộng thành142tests hoặc relabel combined run là chạy sau targeted edit. Actual source gates/typecheck/boundary/generator dùng source cuối tại [status](S05-status.json). Fixture library declarations chỉ là controlled unit inputs, không thực thi MUI; real project commands có proof riêng.

[Before layout](S05-layout-bindings-before.log) có4FAIL/1PASS: ba bypass +one valid barrel false positive. [Initial integration](S05-layout-bindings-initial.log) giữ failures khi legacy fixtures thiếu genuine imports/declarations. Fixtures được sửa để kiểm actual identity, không mở production fallback hoặc hạ threshold. [MUI re-export before](S05-mui-export-before.log) tái hiện missing export-declaration registration; resolver nay duyệt first-party Program sources gồm export-from. Historical partial status files giữ nguyên.

`DONE_BINDING_CAPABILITY_SCOPED` chỉ đóng acceptance S05 đã mô tả. Không nhận alias-proof là readonly, complete style grammar, API closure, ownership geometry, browser behavior hoặc100% UI. Next S06; S07–S20 acceptance không giảm và không đổi full-product/FE ledger.
