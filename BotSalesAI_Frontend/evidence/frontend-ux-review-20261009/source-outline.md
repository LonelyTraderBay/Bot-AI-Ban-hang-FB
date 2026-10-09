## R01 Đăng nhập

/login

### apps/web/src/modules/workspace/index.tsx:29 LoginPage

46 Typography Chào mừng trở lại variant="h4"
46 Typography Một không gian cho bán hàng, kho, kế toán và đội ngũ AI của bạn. 
46 Alert Chế độ xem frontend: tài khoản giả lập, không có mật khẩu thật. 
46 Button Tiếp tục vào cửa hàng to="/workspaces" variant="contained"
46 Button  variant="contained" disabled={pending || loading}
46 Typography Phiên đăng nhập được quản lý ở máy chủ. Không lưu access token trong localStorage. variant="caption"

### apps/web/src/modules/workspace/index.tsx:26 AuthCard

28 Typography BotSales variant="h5"

## R02 Chọn cửa hàng

/workspaces

### apps/web/src/modules/workspace/index.tsx:48 WorkspacesPage

52 Button Tạo cửa hàng to="/onboarding" variant="contained"
55 PageHeader  title="Chọn cửa hàng" subtitle="Mỗi cửa hàng là một vùng dữ liệu và quyền độc lập."
55 Empty  
55 Typography  variant="h5"
55 Typography · 
55 Typography Quyền: variant="caption"
55 Button Mở cửa hàng to={`/s/${s.id}/overview`} variant="outlined"

## R03 Thiết lập cửa hàng

/onboarding

### apps/web/src/modules/workspace/index.tsx:57 OnboardingPage

67 navigate(`/s/${r.data.id}/overview`)  
75 Typography Tạo cửa hàng variant="h4"
75 Typography Chọn tiền tệ cơ sở trước khi ghi nhận giao dịch. 
75 TextField  label="Tên cửa hàng"
75 TextField  label="Tiền tệ cơ sở"
75 TextField  label="Múi giờ"
75 Alert Giao diện Graphite Gold dark-only đã chốt. Những chính sách thật và kết nối ngoài chưa tự bật khi tạo shop. 
75 Button Tạo cửa hàng variant="contained" disabled={!name.trim() || !timezone || pending}
75 Button Quay lại to="/workspaces"

### apps/web/src/modules/workspace/index.tsx:26 AuthCard

28 Typography BotSales variant="h5"

## R04 Tổng quan

/s/:shopId/overview

### apps/web/src/modules/dashboard/index.tsx:33 DashboardPage

44 useCommand('pauseBot', ['getDashboard', 'getBotConfig'])  
57 Typography KHÔNG GIAN ĐIỀU HÀNH variant="overline"
58 Typography Chào , variant="h3"
59 Typography Theo dõi việc cần xử lý, tiến độ đơn hàng và đội ngũ AI — tập trung vào những quyết định quan trọng. 
68 Panel  title="Tình hình hiện tại" subtitle="Các KPI là trạng thái hiện tại do API trả về, không phải dự báo."
71 Stat  title="Hội thoại đang mở"
72 Stat  title="Đơn chờ xử lý"
73 Stat  title="Sản phẩm gần hết"
74 Stat  title="Trợ lý bán hàng"
81 Panel  title="Dòng tiền và doanh thu" subtitle="Doanh thu ghi nhận và tiền đã thu là hai chỉ số khác nhau."
83 Typography Doanh thu đã ghi nhận variant="body2"
83 Typography  variant="h4"
84 Typography Tiền đã thu variant="body2"
84 Typography  variant="h4"
85 RouteLink Xem lợi nhuận to={`/s/${shop.id}/finance/profit-loss`}
86 Alert Không thể tải số liệu tài chính. Dữ liệu của các khu vực khác vẫn dùng được. 
86 Button Thử lại 
87 Alert Chỉ hiển thị khi vai trò có finance.read. 
90 Panel  title="Đơn hàng gần đây" subtitle="Mở đơn để xem trạng thái chuẩn bị, giao hàng và thanh toán."
90 RouteLink Tất cả đơn to={`/s/${shop.id}/orders`}
91 DataTable  label="Đơn hàng gần đây"
92 RouteLink  to={`/s/${shop.id}/orders/${order.id}`}
96 Alert Vai trò hiện tại không có orders.read. 
99 Panel  title="Đội ngũ AI của cửa hàng" subtitle="Trạng thái vai trò lấy từ API; trạng thái kết nối bên ngoài chưa được xác minh."
99 RouteLink Quản lý đội ngũ to={`/s/${shop.id}/bot/team`}
102 Typography  
102 Typography API chưa cung cấp mã vai trò. variant="caption"
104 Typography công cụ được giao variant="caption"
105 Empty  
108 Panel  title="Điều khiển trợ lý" subtitle="Tạm dừng là thao tác có tác động; cần xác nhận và lý do."
111 MutationButton  variant="outlined" busy={pause.pending} disabled={botConfig.status === 'paused'}
112 Alert  
118 Alert  
119 Typography Dữ liệu cập nhật · variant="caption"
121 ConfirmDialog  title="Tạm dừng trợ lý bán hàng" busy={pause.pending} error={pause.error}

## R05 Hộp thư

/s/:shopId/inbox

### apps/web/src/modules/inbox/index.tsx:15 InboxPage

49 PageHeader  title="Hộp thư khách hàng" subtitle="AI và nhân viên tiếp quản rõ ràng; chỉ gửi khi chính sách kênh cho phép."
51 Panel  
54 TextField  label="Trạng thái"
57 TextField  label="Chế độ"
60 TextField  label="Kênh"
63 TextField  label="Nhân viên"
74 Typography  
77 Typography  variant="body2"
83 Empty  
87 Panel  
87 Empty  

### apps/web/src/modules/inbox/index.tsx:91 ConversationPanel

99 useCommand('takeoverConversation', ['getConversation', 'listConversations'])  
100 useCommand('releaseConversation', ['getConversation', 'listConversations'])  
101 useCommand('resolveConversation', ['getConversation', 'listConversations'])  
102 useCommand('createFeedback', ['listFeedback'])  
129 Panel  
132 Button  to={inboxHref()}
137 Typography  variant="h6"
138 Typography · variant="caption"
144 MutationButton  variant="outlined"
147 MutationButton Giải quyết disabled={conversation.status === 'resolved'}
154 Alert Không được gửi tin: . Không tự vượt cửa sổ/chính sách kênh. 
172 Empty  
184 ConfirmDialog  title={action === 'takeover' ? 'Tiếp quản cuộc trò chuyện' : action === 'release' ? 'Trả cuộc trò chuyện về bot' : 'Đánh dấu đã giải quyết'} busy={takeover.pending || release.pending || resolve.pending} error={takeover.error || release.error || resolve.error}
201 EditDialog  title="Đánh giá câu trả lời" busy={feedback.pending}
207 Button Lưu phản hồi variant="contained" disabled={feedback.pending}
226 Typography  
227 TextField  label="Đánh giá"
231 TextField  label="Nội dung đề xuất sửa" minRows={4}
232 Alert Phản hồi không tự trở thành kiến thức đã xuất bản. Cần người duyệt và kiểm thử. 

### apps/web/src/modules/inbox/conversation-components.tsx:99 ConversationMessageList

120 Typography  variant="caption"
123 Typography  
133 Typography · variant="caption"
134 Button Đánh giá 

### apps/web/src/modules/inbox/conversation-components.tsx:14 ConversationComposer

19 useCommand('sendMessage', ['listMessages', 'getConversation', 'listConversations'])  
20 useCommand('addInternalNote', ['listMessages'])  
71 TextField  minRows={2} maxRows={7} label={internal ? 'Ghi chú cho nhóm' : 'Nội dung trả lời khách'} disabled={!canReply}
83 Typography  variant="caption"
86 Button  type="submit" variant="contained" disabled={!canSend || !text.trim() || send.pending || note.pending || send.unresolved || note.unresolved}

### apps/web/src/modules/inbox/conversation-components.tsx:148 ConversationContextPanel

156 useCommand('assignConversation', ['getConversation', 'listConversations'])  
167 Panel  title="Bối cảnh khách hàng"
174 RouteLink Hồ sơ khách to={`/s/${shop.id}/customers/${conversation.customerId}`}
175 Typography Thông tin khách bị ẩn theo quyền hiện tại. variant="caption"
177 RouteLink Tạo đơn từ hội thoại to={`/s/${shop.id}/orders/new?customerId=${conversation.customerId}&conversationId=${conversation.id}`}
182 TextField  label="Giao cho nhân viên"
186 MutationButton Phân công disabled={!assignee} busy={assign.pending}
200 Alert Ảnh/tin thoại chỉ bật khi hợp đồng kênh xác nhận hỗ trợ. Phiên bản API hiện tại của ô soạn chỉ gửi văn bản. 

### apps/web/src/modules/inbox/index.tsx:281 MockSalesFlowPreview

295 Panel  title="Luồng tư vấn bán hàng · bản xem trước" subtitle="Mẫu tương tác cục bộ; không gọi AI và không gửi tin cho khách."
297 Alert Nội dung dưới đây chỉ minh họa giao diện. Bản demo không tự tạo câu trả lời AI hoặc lưu kịch bản lên máy chủ. 
305 TextField  label="Ngành hàng mẫu"
308 Typography Câu hỏi gợi ý variant="subtitle2"
309 Typography . variant="body2"
310 Alert Ranh giới mẫu: 
311 Typography Bản nháp mẫu riêng với cấu hình bot đang dùng; không có thao tác xuất bản ở đây. variant="caption"
314 Alert Giá lấy từ catalog và tồn từ snapshot có thời điểm. Dữ liệu chỉ là mock; cần truy vấn lại trước khi xác nhận đơn. 
316 Alert Cần quyền xem sản phẩm và tồn kho để đối chiếu nguồn. 
318 DataTable  label="Nguồn giá và tồn trong hộp thư" empty="Chưa có sản phẩm đủ dữ liệu để đối chiếu."
325 Typography Preview giới hạn ở 100 sản phẩm và 100 snapshot đầu tiên; không phải danh sách đầy đủ. variant="caption"
326 RouteLink Mở danh sách sản phẩm to={`/s/${shop.id}/products`}
326 RouteLink Mở danh sách tồn kho to={`/s/${shop.id}/inventory`}
330 Typography Chuyển sang biểu mẫu đơn để nhân viên kiểm tra khách, sản phẩm, số lượng và báo giá. variant="body2"
331 RouteLink Mở biểu mẫu tạo đơn từ hội thoại to={`/s/${shop.id}/orders/new?customerId=${customerId}&conversationId=${conversationId}`}
332 Alert Đơn trong demo được lưu vào MSW cục bộ của tab; đây không phải đơn trên máy chủ. 
335 Alert Không tự chốt đơn trong giao diện này. Bằng chứng xác nhận của khách, báo giá hiện hành và điều kiện giao nhận phải được kiểm tra trước khi nhân viên xác nhận. 
336 Button Tự động xác nhận đơn chưa được hỗ trợ variant="outlined"
337 Typography Cần bổ sung capability và policy trong contract trước khi bật tự động xác nhận. variant="caption"

### apps/web/src/modules/inbox/index.tsx:240 MockMediaPreview

243 Alert Preview chỉ dùng dữ liệu tổng hợp. Message contract chưa có media; nội dung mẫu không được gửi, phát hoặc gắn vào hội thoại. 
243 Button  
248 Typography Ảnh sản phẩm mẫu · DEMO-MEDIA-IMAGE-01 variant="body2"
250 Typography Tin thoại mẫu · 00:08 · chưa phát âm thanh variant="body2"
251 Typography Bản chép thử: “Shop còn màu xanh không ạ?” · chưa được người dùng xác nhận. variant="caption"

### apps/web/src/modules/inbox/index.tsx:343 MockUpsellPreview

346 Typography Gợi ý bán kèm mẫu · DEMO-PROMO-01 variant="subtitle2"
347 Alert Combo áo thun + túi tote chỉ minh họa giao diện. Không có API khuyến mại; giá, lợi nhuận, SKU và tồn kho chưa được xác thực. 
348 Button  variant="outlined"
350 Typography Combo mẫu · DEMO-PROMO-01 variant="subtitle2"
351 Typography Điều kiện minh họa: có ít nhất một áo và một phụ kiện trong đơn nháp. variant="body2"
352 Typography Không áp dụng giảm giá, không sửa đơn và không khẳng định đạt biên lợi nhuận. variant="caption"

## R06 Chi tiết hội thoại

/s/:shopId/inbox/:conversationId

### apps/web/src/modules/inbox/index.tsx:15 InboxPage

49 PageHeader  title="Hộp thư khách hàng" subtitle="AI và nhân viên tiếp quản rõ ràng; chỉ gửi khi chính sách kênh cho phép."
51 Panel  
54 TextField  label="Trạng thái"
57 TextField  label="Chế độ"
60 TextField  label="Kênh"
63 TextField  label="Nhân viên"
74 Typography  
77 Typography  variant="body2"
83 Empty  
87 Panel  
87 Empty  

### apps/web/src/modules/inbox/index.tsx:91 ConversationPanel

99 useCommand('takeoverConversation', ['getConversation', 'listConversations'])  
100 useCommand('releaseConversation', ['getConversation', 'listConversations'])  
101 useCommand('resolveConversation', ['getConversation', 'listConversations'])  
102 useCommand('createFeedback', ['listFeedback'])  
129 Panel  
132 Button  to={inboxHref()}
137 Typography  variant="h6"
138 Typography · variant="caption"
144 MutationButton  variant="outlined"
147 MutationButton Giải quyết disabled={conversation.status === 'resolved'}
154 Alert Không được gửi tin: . Không tự vượt cửa sổ/chính sách kênh. 
172 Empty  
184 ConfirmDialog  title={action === 'takeover' ? 'Tiếp quản cuộc trò chuyện' : action === 'release' ? 'Trả cuộc trò chuyện về bot' : 'Đánh dấu đã giải quyết'} busy={takeover.pending || release.pending || resolve.pending} error={takeover.error || release.error || resolve.error}
201 EditDialog  title="Đánh giá câu trả lời" busy={feedback.pending}
207 Button Lưu phản hồi variant="contained" disabled={feedback.pending}
226 Typography  
227 TextField  label="Đánh giá"
231 TextField  label="Nội dung đề xuất sửa" minRows={4}
232 Alert Phản hồi không tự trở thành kiến thức đã xuất bản. Cần người duyệt và kiểm thử. 

### apps/web/src/modules/inbox/conversation-components.tsx:99 ConversationMessageList

120 Typography  variant="caption"
123 Typography  
133 Typography · variant="caption"
134 Button Đánh giá 

### apps/web/src/modules/inbox/conversation-components.tsx:14 ConversationComposer

19 useCommand('sendMessage', ['listMessages', 'getConversation', 'listConversations'])  
20 useCommand('addInternalNote', ['listMessages'])  
71 TextField  minRows={2} maxRows={7} label={internal ? 'Ghi chú cho nhóm' : 'Nội dung trả lời khách'} disabled={!canReply}
83 Typography  variant="caption"
86 Button  type="submit" variant="contained" disabled={!canSend || !text.trim() || send.pending || note.pending || send.unresolved || note.unresolved}

### apps/web/src/modules/inbox/conversation-components.tsx:148 ConversationContextPanel

156 useCommand('assignConversation', ['getConversation', 'listConversations'])  
167 Panel  title="Bối cảnh khách hàng"
174 RouteLink Hồ sơ khách to={`/s/${shop.id}/customers/${conversation.customerId}`}
175 Typography Thông tin khách bị ẩn theo quyền hiện tại. variant="caption"
177 RouteLink Tạo đơn từ hội thoại to={`/s/${shop.id}/orders/new?customerId=${conversation.customerId}&conversationId=${conversation.id}`}
182 TextField  label="Giao cho nhân viên"
186 MutationButton Phân công disabled={!assignee} busy={assign.pending}
200 Alert Ảnh/tin thoại chỉ bật khi hợp đồng kênh xác nhận hỗ trợ. Phiên bản API hiện tại của ô soạn chỉ gửi văn bản. 

### apps/web/src/modules/inbox/index.tsx:281 MockSalesFlowPreview

295 Panel  title="Luồng tư vấn bán hàng · bản xem trước" subtitle="Mẫu tương tác cục bộ; không gọi AI và không gửi tin cho khách."
297 Alert Nội dung dưới đây chỉ minh họa giao diện. Bản demo không tự tạo câu trả lời AI hoặc lưu kịch bản lên máy chủ. 
305 TextField  label="Ngành hàng mẫu"
308 Typography Câu hỏi gợi ý variant="subtitle2"
309 Typography . variant="body2"
310 Alert Ranh giới mẫu: 
311 Typography Bản nháp mẫu riêng với cấu hình bot đang dùng; không có thao tác xuất bản ở đây. variant="caption"
314 Alert Giá lấy từ catalog và tồn từ snapshot có thời điểm. Dữ liệu chỉ là mock; cần truy vấn lại trước khi xác nhận đơn. 
316 Alert Cần quyền xem sản phẩm và tồn kho để đối chiếu nguồn. 
318 DataTable  label="Nguồn giá và tồn trong hộp thư" empty="Chưa có sản phẩm đủ dữ liệu để đối chiếu."
325 Typography Preview giới hạn ở 100 sản phẩm và 100 snapshot đầu tiên; không phải danh sách đầy đủ. variant="caption"
326 RouteLink Mở danh sách sản phẩm to={`/s/${shop.id}/products`}
326 RouteLink Mở danh sách tồn kho to={`/s/${shop.id}/inventory`}
330 Typography Chuyển sang biểu mẫu đơn để nhân viên kiểm tra khách, sản phẩm, số lượng và báo giá. variant="body2"
331 RouteLink Mở biểu mẫu tạo đơn từ hội thoại to={`/s/${shop.id}/orders/new?customerId=${customerId}&conversationId=${conversationId}`}
332 Alert Đơn trong demo được lưu vào MSW cục bộ của tab; đây không phải đơn trên máy chủ. 
335 Alert Không tự chốt đơn trong giao diện này. Bằng chứng xác nhận của khách, báo giá hiện hành và điều kiện giao nhận phải được kiểm tra trước khi nhân viên xác nhận. 
336 Button Tự động xác nhận đơn chưa được hỗ trợ variant="outlined"
337 Typography Cần bổ sung capability và policy trong contract trước khi bật tự động xác nhận. variant="caption"

### apps/web/src/modules/inbox/index.tsx:240 MockMediaPreview

243 Alert Preview chỉ dùng dữ liệu tổng hợp. Message contract chưa có media; nội dung mẫu không được gửi, phát hoặc gắn vào hội thoại. 
243 Button  
248 Typography Ảnh sản phẩm mẫu · DEMO-MEDIA-IMAGE-01 variant="body2"
250 Typography Tin thoại mẫu · 00:08 · chưa phát âm thanh variant="body2"
251 Typography Bản chép thử: “Shop còn màu xanh không ạ?” · chưa được người dùng xác nhận. variant="caption"

### apps/web/src/modules/inbox/index.tsx:343 MockUpsellPreview

346 Typography Gợi ý bán kèm mẫu · DEMO-PROMO-01 variant="subtitle2"
347 Alert Combo áo thun + túi tote chỉ minh họa giao diện. Không có API khuyến mại; giá, lợi nhuận, SKU và tồn kho chưa được xác thực. 
348 Button  variant="outlined"
350 Typography Combo mẫu · DEMO-PROMO-01 variant="subtitle2"
351 Typography Điều kiện minh họa: có ít nhất một áo và một phụ kiện trong đơn nháp. variant="body2"
352 Typography Không áp dụng giảm giá, không sửa đơn và không khẳng định đạt biên lợi nhuận. variant="caption"

## R07 Khách hàng

/s/:shopId/customers

### apps/web/src/modules/customers/index.tsx:52 CustomersPage

57 useCommand('createCustomer', ['listCustomers'])  
70 navigate(`/s/${shop.id}/customers/${response.data.id}`)  
73 PageHeader  title={t('customers.list.title')} subtitle={t('customers.list.subtitle')}
73 MutationButton  variant="contained"
73 Panel  
73 DataTable  label={t('customers.list.tableLabel')} empty={t('customers.list.empty')}
74 Typography  
74 RouteLink  to={`/s/${shop.id}/customers/${c.id}`}
75 EditDialog  title={t('customers.form.createTitle')} busy={create.pending}
75 Button  type="submit" variant="contained" disabled={create.pending}
75 TextField  label={t(field.labelKey)} disabled={create.pending} error={!!form.formState.errors[field.name]} helperText={form.formState.errors[field.name]?.message}

## R08 Hồ sơ khách

/s/:shopId/customers/:customerId

### apps/web/src/modules/customers/index.tsx:77 CustomerPage

91 useCommand('updateCustomer', ['getCustomer', 'listCustomers'])  
118 PageHeader  title={customer.data?.data.displayName || t('customers.detail.fallbackTitle')} subtitle={t('customers.detail.subtitle')}
118 RouteLink  to={'/s/' + shop.id + '/customers'}
121 Panel  title={t('customers.detail.information')}
125 Alert  
126 TextField  label={t(field.labelKey)} error={!!form.formState.errors[field.name]} helperText={form.formState.errors[field.name]?.message} disabled={!canEdit || customer.data?.data.redactedFields.includes(field.name)} minRows={field.multiline ? 3 : undefined}
127 MutationButton  type="submit" variant="contained" busy={update.pending} disabled={!editor.dirty}
131 Panel  title={t('customers.detail.recentOrders')}
136 RouteLink  to={'/s/' + shop.id + '/orders/' + order.id}
137 Typography  
138 Typography  variant="caption"
139 RouteLink  to={'/s/' + shop.id + '/orders'}
142 Alert  
145 Panel  title={t('customers.detail.relatedShipments')}
149 Typography  
150 Alert  
153 Typography  
154 RouteLink  to={'/s/' + shop.id + '/orders/' + item.orderId}
159 Typography  
160 Typography  variant="caption"
162 RouteLink  to={'/s/' + shop.id + '/shipments'}
165 Alert  
167 Panel  title={t('customers.detail.supportCases')}
171 Typography  
172 Typography  variant="caption"
173 RouteLink  to={'/s/' + shop.id + '/service-cases'}

## R09 Sản phẩm

/s/:shopId/products

### apps/web/src/modules/catalog/index.tsx:29 ProductsPage

51 PageHeader  title="Sản phẩm" subtitle="Một nguồn thông tin cho tư vấn, giá bán và các biến thể."
51 MutationButton Thêm sản phẩm variant="contained"
51 navigate(`/s/${shop.id}/products/new`)  
51 Panel  
53 TextField  label="Trạng thái"
58 TextField  label="Tìm danh mục" helperText="Tìm danh mục trên toàn cửa hàng."
61 TextField  label="Danh mục"
67 Button Thử lại danh mục 
70 DataTable  
72 Typography  
72 Typography  variant="caption"
74 RouteLink Chi tiết to={`/s/${shop.id}/products/${p.id}`}

## R10 Thêm sản phẩm

/s/:shopId/products/new

### apps/web/src/modules/catalog/index.tsx:77 ProductEditorPage

92 useCommand('createProduct', ['listProducts'])  
93 useCommand('updateProduct', ['getProduct', 'listProducts'])  
94 useCommand('archiveProduct', ['getProduct', 'listProducts'])  
99 useCommand('uploadFile', [])  
138 navigate(`/s/${shop.id}/products/${response.data.id}`, { replace: true })  
142 PageHeader  title={productId ? 'Thông tin sản phẩm' : 'Thêm sản phẩm'} subtitle="Giá theo biến thể. Tồn kho được quản lý ở màn hình riêng."
142 Button Danh sách to={`/s/${shop.id}/products`}
143 Panel  title="Thông tin bán hàng"
143 TextField  label="Tên sản phẩm" error={!!errors.name} helperText={errors.name?.message} disabled={!canWrite}
143 TextField  label="Mô tả dùng cho AI tư vấn" minRows={4} disabled={!canWrite}
143 TextField  label="Tìm danh mục" disabled={!canWrite} helperText="Tìm trên danh sách cửa hàng; có thể tải thêm khi cần."
143 TextField  label="Danh mục" disabled={!canWrite}
143 Alert Đang tải danh mục… 
143 Alert  
143 Button Thử lại danh mục 
143 Alert  
143 Alert Đang tải tên danh mục đã gắn với sản phẩm… 
143 Alert  
143 Button Thử lại danh mục đang chọn 
143 TextField  label="Trạng thái" disabled={!canWrite}
144 Panel  title="Biến thể và giá"
144 Button Thêm biến thể disabled={!canWrite}
144 TextField  label="SKU" error={!!errors.variants?.[index]?.sku} helperText={errors.variants?.[index]?.sku?.message} disabled={!canWrite}
144 TextField  label="Tên / màu / kích cỡ" disabled={!canWrite}
144 TextField  label={`Giá bán (${shop.currency})`} error={!!errors.variants?.[index]?.price} helperText={errors.variants?.[index]?.price?.message} disabled={!canWrite}
145 Panel  title="Ảnh sản phẩm" subtitle="File được kiểm soát qua API upload; không nhúng secret hoặc URL tùy ý."
145 Typography tệp được gắn với sản phẩm variant="body2"
145 Button Chọn ảnh variant="outlined" disabled={!canWrite || pending}
152 Alert  
152 Typography  variant="caption"
152 Button Bỏ liên kết ảnh disabled={!canWrite}
153 MutationButton Ngừng bán 
153 MutationButton Lưu sản phẩm type="submit" variant="contained" busy={pending}
154 ConfirmDialog  title="Ngừng bán sản phẩm" busy={archive.pending} error={archive.error}

## R11 Chi tiết sản phẩm

/s/:shopId/products/:productId

### apps/web/src/modules/catalog/index.tsx:77 ProductEditorPage

92 useCommand('createProduct', ['listProducts'])  
93 useCommand('updateProduct', ['getProduct', 'listProducts'])  
94 useCommand('archiveProduct', ['getProduct', 'listProducts'])  
99 useCommand('uploadFile', [])  
138 navigate(`/s/${shop.id}/products/${response.data.id}`, { replace: true })  
142 PageHeader  title={productId ? 'Thông tin sản phẩm' : 'Thêm sản phẩm'} subtitle="Giá theo biến thể. Tồn kho được quản lý ở màn hình riêng."
142 Button Danh sách to={`/s/${shop.id}/products`}
143 Panel  title="Thông tin bán hàng"
143 TextField  label="Tên sản phẩm" error={!!errors.name} helperText={errors.name?.message} disabled={!canWrite}
143 TextField  label="Mô tả dùng cho AI tư vấn" minRows={4} disabled={!canWrite}
143 TextField  label="Tìm danh mục" disabled={!canWrite} helperText="Tìm trên danh sách cửa hàng; có thể tải thêm khi cần."
143 TextField  label="Danh mục" disabled={!canWrite}
143 Alert Đang tải danh mục… 
143 Alert  
143 Button Thử lại danh mục 
143 Alert  
143 Alert Đang tải tên danh mục đã gắn với sản phẩm… 
143 Alert  
143 Button Thử lại danh mục đang chọn 
143 TextField  label="Trạng thái" disabled={!canWrite}
144 Panel  title="Biến thể và giá"
144 Button Thêm biến thể disabled={!canWrite}
144 TextField  label="SKU" error={!!errors.variants?.[index]?.sku} helperText={errors.variants?.[index]?.sku?.message} disabled={!canWrite}
144 TextField  label="Tên / màu / kích cỡ" disabled={!canWrite}
144 TextField  label={`Giá bán (${shop.currency})`} error={!!errors.variants?.[index]?.price} helperText={errors.variants?.[index]?.price?.message} disabled={!canWrite}
145 Panel  title="Ảnh sản phẩm" subtitle="File được kiểm soát qua API upload; không nhúng secret hoặc URL tùy ý."
145 Typography tệp được gắn với sản phẩm variant="body2"
145 Button Chọn ảnh variant="outlined" disabled={!canWrite || pending}
152 Alert  
152 Typography  variant="caption"
152 Button Bỏ liên kết ảnh disabled={!canWrite}
153 MutationButton Ngừng bán 
153 MutationButton Lưu sản phẩm type="submit" variant="contained" busy={pending}
154 ConfirmDialog  title="Ngừng bán sản phẩm" busy={archive.pending} error={archive.error}

## R12 Danh mục hàng

/s/:shopId/categories

### apps/web/src/modules/catalog/index.tsx:160 CategoriesPage

162 useCommand('createCategory', ['listCategories'])  
163 useCommand('updateCategory', ['listCategories'])  
164 useCommand('archiveCategory', ['listCategories'])  
179 PageHeader  title="Danh mục" subtitle="Sắp xếp sản phẩm, không thay đổi tồn kho."
179 MutationButton Thêm danh mục variant="contained"
179 Panel  
179 DataTable  
182 MutationButton Sửa 
182 MutationButton Ngừng dùng 
185 EditDialog  title={edit ? 'Sửa danh mục' : 'Thêm danh mục'} busy={create.pending || update.pending || waitingForDetail}
185 Button Lưu variant="contained" disabled={!name.trim() || create.pending || update.pending || waitingForDetail}
199 Alert  
199 Button Thử lại 
199 TextField  label="Tên" disabled={waitingForDetail}
199 TextField  label="Danh mục cha" disabled={waitingForDetail}
200 ConfirmDialog  title="Ngừng dùng danh mục" error={archive.error} busy={archive.pending}

## R13 Nhập dữ liệu

/s/:shopId/imports

### apps/web/src/modules/catalog/imports.tsx:13 ImportsPage

17 useCommand('uploadFile', [])  
18 useCommand('createProductImport', ['listJobs'])  
32 PageHeader  title="Nhập dữ liệu sản phẩm" subtitle="Tải tệp → ánh xạ cột → kiểm tra trước → xác nhận các dòng hợp lệ."
33 Panel  title="Tệp & ánh xạ"
37 Alert Trong demo mô phỏng: CSV UTF-8 tối đa 5 MB và 1.000 dòng dữ liệu. Khi nối backend thật, giới hạn được lấy từ API. 
38 Button  variant="outlined"
50 Alert  
52 Typography Mẫu CSV tổng hợp để kiểm tra import. XLSX chưa có parser được chốt; chuyển sang CSV, không đổi đuôi tệp. variant="body2"
53 Button Tải CSV mẫu 
56 TextField  label="Tên cột trong tệp"
57 TextField  label="Trường sản phẩm"
64 Button Bỏ 
66 Button Thêm cột 
67 TextField  label="Khi trùng SKU"
71 MutationButton Kiểm tra trước khi nhập variant="contained" busy={upload.pending || dry.pending} disabled={!file || mapping.some(item => !item.sourceColumn)}
89 Panel  title="Tác vụ gần đây" subtitle="Tình trạng xử lý do API trả về; dữ liệu mẫu chỉ chạy trong bộ nhớ."
92 DataTable  label="Tác vụ nền gần đây" empty="Chưa có tác vụ nào trong cửa hàng."
99 RouteLink Xem kết quả to={job.kind === 'import' ? '/s/' + shop.id + '/imports/' + job.id : '/s/' + shop.id + '/jobs/' + job.id}

## R14 Kết quả nhập dữ liệu

/s/:shopId/imports/:jobId

### apps/web/src/modules/catalog/imports.tsx:107 ImportResultPage

111 useCommand('commitProductImport', ['getJob', 'listJobs', 'listProducts', 'listStockSnapshots'])  
114 PageHeader  title="Kết quả kiểm tra tệp" subtitle="Không nhập dữ liệu âm thầm khi còn lỗi; token kiểm tra gắn với phiên bản dữ liệu."
114 Panel  title={j.id}
114 DataTable  
114 Alert Xác nhận chỉ nhập những dòng đã hợp lệ. Dòng lỗi được giữ trong báo cáo, không coi là nhập thành công. 
114 MutationButton Xác nhận nhập các dòng hợp lệ variant="contained" disabled={!j.validationToken || j.status !== 'awaiting_confirmation'}
114 RouteLink Chọn tệp khác to={`/s/${shop.id}/imports`}
114 ConfirmDialog  title="Ghi dữ liệu đã kiểm tra" error={commit.error} busy={commit.pending}

## R15 Tồn kho

/s/:shopId/inventory

### apps/web/src/modules/inventory/index.tsx:75 InventoryPage

80 useCommand('createInventoryAdjustment', ['listStockSnapshots', 'listStockMovements', 'getDashboard'])  
117 PageHeader  title="Tồn kho" subtitle="Tồn thực tế, đã giữ cho đơn và số còn có thể bán."
117 RouteLink Lịch sử biến động to={`/s/${shop.id}/inventory/movements`}
118 Alert Snapshot kho do API cung cấp; không cộng hàng đang về hoặc hàng cách ly vào số có thể bán. Kho mặc định: . 
119 Alert Điều chỉnh đã được xác nhận. Mã lệnh: . Tồn kho và lịch sử đã được tải lại. 
120 Panel  
121 DataTable  label="Tồn kho theo vị trí"
122 Typography  
122 Typography · snapshot variant="caption"
122 RouteLink Mở sản phẩm to={`/s/${shop.id}/products?q=${encodeURIComponent(row.sku)}`}
125 Typography  
129 MutationButton Điều chỉnh 
133 EditDialog  title={`Điều chỉnh ${item?.sku || ''}`} busy={submitting}
133 MutationButton Xác nhận điều chỉnh variant="contained" busy={submitting} type="button"
136 Alert API kiểm tra lại phiên bản và lượng đang giữ. Không nhập tổng tồn; không thể giảm thấp hơn lượng đã giữ. 
137 TextField  label="Thay đổi số lượng" error={!!errors.quantityDelta} helperText={errors.quantityDelta?.message}
138 TextField  label="Lý do điều chỉnh" minRows={2} error={!!errors.reason} helperText={errors.reason?.message}
139 TextField  label={`Giá vốn đơn vị (${shop.currency})`} error={!!errors.unitCost} helperText={errors.unitCost?.message || 'Để trống nếu không cập nhật giá vốn.'}

### apps/web/src/modules/inventory/index.tsx:29 InventoryFilters

63 TextField  label="Mã kho"
65 TextField  label="Mã biến thể"
69 Button Áp dụng bộ lọc type="button" variant="outlined"
70 Button Xóa bộ lọc type="button"

## R16 Lịch sử kho

/s/:shopId/inventory/movements

### apps/web/src/modules/inventory/index.tsx:145 MovementsPage

150 PageHeader  title="Lịch sử kho" subtitle="Truy nguyên mỗi thay đổi đến chứng từ và người thực hiện."
150 RouteLink Về tồn kho to={`/s/${shop.id}/inventory`}
151 Panel  
152 DataTable  label="Lịch sử biến động kho"

### apps/web/src/modules/inventory/index.tsx:29 InventoryFilters

63 TextField  label="Mã kho"
65 TextField  label="Mã biến thể"
69 Button Áp dụng bộ lọc type="button" variant="outlined"
70 Button Xóa bộ lọc type="button"

### apps/web/src/modules/inventory/index.tsx:168 movementSource

171 RouteLink Đơn to={`/s/${shopId}/orders/${encodeURIComponent(row.sourceRef.id)}`}

## R17 Đơn hàng

/s/:shopId/orders

### apps/web/src/modules/orders/index.tsx:19 OrdersPage

19 PageHeader  title="Đơn hàng" subtitle="Tách riêng trạng thái đơn, giao hàng và thanh toán."
19 MutationButton Tạo đơn hàng variant="contained"
19 navigate(`/s/${shop.id}/orders/new`)  
19 Panel  
19 DataTable  
21 Typography  
21 Typography  variant="caption"
23 RouteLink Xem đơn to={`/s/${shop.id}/orders/${o.id}`}

## R18 Tạo đơn nháp

/s/:shopId/orders/new

### apps/web/src/modules/orders/index.tsx:149 NewOrderPage

149 PageHeader  title="Tạo đơn hàng" subtitle="Lưu nháp trước, sau đó báo giá và xác nhận khách."
149 RouteLink Danh sách đơn to={`/s/${shop.id}/orders`}
149 navigate(`/s/${shop.id}/orders/${o.id}`)  

### apps/web/src/modules/orders/index.tsx:25 DraftForm

42 useCommand('createOrder', ['listOrders'])  
43 useCommand('updateOrderDraft', ['getOrder', 'listOrders'])  
92 Alert Bạn cần quyền customers.read để tìm và tạo đơn với khách hàng. Đơn nháp hiện có vẫn giữ nguyên mã khách. 
93 Alert Bạn cần quyền catalog.read để tìm và chọn sản phẩm cho đơn hàng. 
96 Panel  title="Người mua và giao hàng"
97 TextField  label="Tìm khách hàng" disabled={!canReadCustomers} helperText="Tìm qua listCustomers với q; chỉ chọn mã do API trả về."
98 TextField  label="Khách hàng" disabled={!canReadCustomers && !resource} helperText={canReadCustomers ? (customers.isPending ? 'Đang tải khách hàng…' : customers.data?.data.length === 0 ? 'Không tìm thấy khách phù hợp.' : !customerId ? 'Chọn khách hàng để lưu đơn nháp.' : undefined) : undefined}
103 TextField  label="Hội thoại liên quan" disabled={!canReadConversations || !customerId} helperText={!canReadConversations ? 'Không có quyền đọc hội thoại; liên kết hội thoại là tùy chọn.' : undefined}
108 TextField  label="Mã kho xuất"
110 Typography  variant="caption"
111 Typography  
112 Typography Địa chỉ được giữ nguyên khi chỉnh sửa đơn nháp. variant="caption"
113 TextField  label="Địa chỉ giao hàng (mẫu demo)" helperText="Lựa chọn tổng hợp để kiểm thử luồng đơn hàng."
116 TextField  label="Mã địa chỉ đã xác minh" helperText="Nhập ID do hệ thống địa chỉ cung cấp."
118 Alert Địa chỉ mẫu chỉ phục vụ nghiệm thu giao diện. Dữ liệu demo không đại diện địa chỉ thật và không xác minh địa chỉ với khách hàng. 
118 Alert Contract frontend chưa có API CRUD địa chỉ giao hàng; chỉ sử dụng ID do hệ thống địa chỉ cung cấp. 
120 Typography Thanh toán variant="caption"
121 Typography  
122 TextField  label="Thanh toán"
124 Panel  title="Sản phẩm đặt mua" subtitle="Bộ chọn tìm kiếm từ API; giá và tồn kho chỉ được chốt khi lấy báo giá."
124 Button Thêm dòng disabled={lines.length >= 100}
126 TextField  label="Tìm sản phẩm hoặc SKU" disabled={!canReadProducts} helperText="Tìm từ listProducts với q; biến thể không hoạt động không được chọn."
131 TextField  label={`Sản phẩm ${index + 1}`} disabled={!canReadProducts && !resource} error={duplicateVariants && !!line.variantId} helperText={duplicateVariants && line.variantId ? 'Không thêm cùng một biến thể hai lần; hãy gộp số lượng vào một dòng.' : undefined}
136 TextField  label="Số lượng" error={quantityInvalid} helperText={quantityInvalid ? 'Nhập số nguyên từ 1 đến 1.000.000.' : 'Số lượng nguyên theo hợp đồng.'}
141 Alert Đơn nháp đạt giới hạn 100 dòng theo hợp đồng. 
142 Alert Tổng tiền và khả năng giữ hàng được tính lại bởi API khi lấy báo giá và xác nhận; không tin tổng do trình duyệt tự tính. 
143 TextField  label="Ghi chú chuẩn bị" error={codePointLength(notes) > 2_000} helperText={`${codePointLength(notes)}/2.000 ký tự`} minRows={2}
146 MutationButton Lưu đơn nháp variant="contained" busy={create.pending || update.pending} disabled={!valid || !canWriteOrders} type="submit"

## R19 Chi tiết đơn hàng

/s/:shopId/orders/:orderId

### apps/web/src/modules/orders/index.tsx:150 OrderDetailPage

157 useCommand('quoteOrder', ['getOrder'])  
158 useCommand('recordCustomerConfirmation', [])  
159 useCommand('confirmOrder', ['getOrder', 'listOrders', 'listStockSnapshots', 'getDashboard', 'listWorkItems', 'listNotifications', 'listPrepJobs'])  
160 useCommand('cancelOrder', ['getOrder', 'listOrders', 'listStockSnapshots', 'listWorkItems', 'listPrepJobs'])  
161 useCommand('payOrder', ['getOrder', 'listOrders', 'getCashflow', 'listFinanceEntries'])  
162 useCommand('refundOrder', ['getOrder', 'listOrders', 'getCashflow'])  
207 PageHeader  title={`Đơn ${orderId}`} subtitle="Mọi thay đổi quan trọng kiểm lại phiên bản và điều kiện nghiệp vụ."
207 RouteLink Danh sách đơn to={`/s/${shop.id}/orders`}
208 EditDialog  title="Sửa đơn nháp" busy={editBusy}
208 Button Đóng chỉnh sửa disabled={busy}
209 Typography Phiên bản variant="caption"
210 Panel  title="Sản phẩm trong đơn"
210 DataTable  
212 Typography  
212 Typography  variant="caption"
215 Typography Tổng từ API 
215 Typography  variant="h4"
215 Panel  title="Thông tin xử lý"
215 RouteLink  to={`/s/${shop.id}/customers/${order.customerId}`}
215 RouteLink Mở hội thoại to={`/s/${shop.id}/inbox/${order.conversationId}`}
215 RouteLink Chuẩn bị đơn to={`/s/${shop.id}/fulfillment`}
216 MutationButton Sửa đơn nháp 
216 MutationButton Lấy báo giá hiện tại variant="contained" busy={quoteOp.pending}
223 MutationButton Hủy đơn 
223 MutationButton Ghi nhận tiền đã thu 
223 MutationButton Ghi nhận khoản đã hoàn 
223 RouteLink Tạo yêu cầu trả hàng to={`/s/${shop.id}/returns?orderId=${order.id}`}
224 Panel  title="Báo giá và xác nhận khách" subtitle={`Bản đơn ${quote.orderVersion} · Hết hạn ${dateTime(quote.expiresAt, shop.timezone)}`}
224 Typography  variant="h5"
224 Alert  
224 Typography Mã báo giá: variant="body2"
224 Typography Hash do server cung cấp: variant="caption"
224 Alert Báo giá đã hết hạn. Lấy báo giá mới và xác nhận lại với khách trước khi chốt. 
224 Alert  
224 Button Nhập bằng chứng xác nhận khách 
224 Button Mô phỏng khách đồng ý báo giá variant="outlined" disabled={record.pending}
224 MutationButton Xác nhận đơn & giữ hàng variant="contained" disabled={!confirmation || quoteExpired || confirmationExpired} busy={confirm.pending}
234 ConfirmDialog  title="Hủy đơn hàng" busy={cancel.pending} error={cancel.error}
235 EditDialog  title="Bằng chứng xác nhận từ khách" busy={record.pending}
235 Button Ghi nhận bằng chứng variant="contained" disabled={!/^[a-f0-9]{64}$/.test(hash) || !identity || !messageId || record.pending}
235 Alert Không dùng lời AI “khách đã đồng ý” để xác nhận. Cần định danh và tin nhắn khách thực sự xác nhận đúng báo giá. 
235 TextField  label="Hash báo giá từ backend"
235 TextField  label="Định danh khách"
235 TextField  label="Mã tin nhắn xác nhận"
236 EditDialog  title={action === 'pay' ? 'Ghi nhận tiền đã thu' : 'Ghi nhận tiền đã hoàn'} busy={pay.pending || refund.pending}
236 Button Ghi nhận chứng từ variant="contained" disabled={!/^\d+(\.\d{1,4})?$/.test(amount) || !evidenceRef || !reference || codePointLength(reason.trim()) < 5 || pay.pending || refund.pending}
250 Alert Chỉ ghi khoản đã được xác minh. Nút này không chuyển tiền. Ảnh chuyển khoản chưa xác thực không là bằng chứng thanh toán. 
250 TextField  label={`Số tiền (${shop.currency})`}
250 TextField  label="Mã tham chiếu giao dịch"
250 TextField  label="Mã chứng từ đã xác minh"
250 TextField  label="Lý do" minRows={2}

### apps/web/src/modules/orders/index.tsx:25 DraftForm

42 useCommand('createOrder', ['listOrders'])  
43 useCommand('updateOrderDraft', ['getOrder', 'listOrders'])  
92 Alert Bạn cần quyền customers.read để tìm và tạo đơn với khách hàng. Đơn nháp hiện có vẫn giữ nguyên mã khách. 
93 Alert Bạn cần quyền catalog.read để tìm và chọn sản phẩm cho đơn hàng. 
96 Panel  title="Người mua và giao hàng"
97 TextField  label="Tìm khách hàng" disabled={!canReadCustomers} helperText="Tìm qua listCustomers với q; chỉ chọn mã do API trả về."
98 TextField  label="Khách hàng" disabled={!canReadCustomers && !resource} helperText={canReadCustomers ? (customers.isPending ? 'Đang tải khách hàng…' : customers.data?.data.length === 0 ? 'Không tìm thấy khách phù hợp.' : !customerId ? 'Chọn khách hàng để lưu đơn nháp.' : undefined) : undefined}
103 TextField  label="Hội thoại liên quan" disabled={!canReadConversations || !customerId} helperText={!canReadConversations ? 'Không có quyền đọc hội thoại; liên kết hội thoại là tùy chọn.' : undefined}
108 TextField  label="Mã kho xuất"
110 Typography  variant="caption"
111 Typography  
112 Typography Địa chỉ được giữ nguyên khi chỉnh sửa đơn nháp. variant="caption"
113 TextField  label="Địa chỉ giao hàng (mẫu demo)" helperText="Lựa chọn tổng hợp để kiểm thử luồng đơn hàng."
116 TextField  label="Mã địa chỉ đã xác minh" helperText="Nhập ID do hệ thống địa chỉ cung cấp."
118 Alert Địa chỉ mẫu chỉ phục vụ nghiệm thu giao diện. Dữ liệu demo không đại diện địa chỉ thật và không xác minh địa chỉ với khách hàng. 
118 Alert Contract frontend chưa có API CRUD địa chỉ giao hàng; chỉ sử dụng ID do hệ thống địa chỉ cung cấp. 
120 Typography Thanh toán variant="caption"
121 Typography  
122 TextField  label="Thanh toán"
124 Panel  title="Sản phẩm đặt mua" subtitle="Bộ chọn tìm kiếm từ API; giá và tồn kho chỉ được chốt khi lấy báo giá."
124 Button Thêm dòng disabled={lines.length >= 100}
126 TextField  label="Tìm sản phẩm hoặc SKU" disabled={!canReadProducts} helperText="Tìm từ listProducts với q; biến thể không hoạt động không được chọn."
131 TextField  label={`Sản phẩm ${index + 1}`} disabled={!canReadProducts && !resource} error={duplicateVariants && !!line.variantId} helperText={duplicateVariants && line.variantId ? 'Không thêm cùng một biến thể hai lần; hãy gộp số lượng vào một dòng.' : undefined}
136 TextField  label="Số lượng" error={quantityInvalid} helperText={quantityInvalid ? 'Nhập số nguyên từ 1 đến 1.000.000.' : 'Số lượng nguyên theo hợp đồng.'}
141 Alert Đơn nháp đạt giới hạn 100 dòng theo hợp đồng. 
142 Alert Tổng tiền và khả năng giữ hàng được tính lại bởi API khi lấy báo giá và xác nhận; không tin tổng do trình duyệt tự tính. 
143 TextField  label="Ghi chú chuẩn bị" error={codePointLength(notes) > 2_000} helperText={`${codePointLength(notes)}/2.000 ký tự`} minRows={2}
146 MutationButton Lưu đơn nháp variant="contained" busy={create.pending || update.pending} disabled={!valid || !canWriteOrders} type="submit"

## R20 Thu/chi tổng quan

/s/:shopId/finance

### apps/web/src/modules/finance/index.tsx:100 CashflowPage

105 PageHeader  title="Dòng tiền" subtitle="Tiền thực thu và thực chi, tách biệt doanh thu và lợi nhuận."
105 RouteLink Sổ thu chi to={`/s/${shop.id}/finance/entries`}
105 Stat  title="Tiền đã thu"
105 Stat  title="Tiền đã chi"
105 Stat  title="Biến động tiền thuần"
105 Stat  title="Múi giờ báo cáo"
105 Panel  title="Kỳ báo cáo"
105 Alert  
105 Alert Ngày bắt đầu phải trước ngày kết thúc. 

### apps/web/src/modules/finance/index.tsx:70 ReportRangeFields

72 TextField  type="date" label="Từ ngày"
73 TextField  type="date" label="Đến trước ngày"
74 Alert Khoảng [Từ, Đến); múi giờ . 

## R21 Sổ thu/chi

/s/:shopId/finance/entries

### apps/web/src/modules/finance/index.tsx:107 EntriesPage

110 useCommand('createFinanceEntry', ['listFinanceEntries'])  
111 useCommand('updateFinanceEntry', ['listFinanceEntries'])  
112 useCommand('postFinanceEntry', ['listFinanceEntries', 'getCashflow', 'getProfitLoss', 'listJournals'])  
113 useCommand('reverseFinanceEntry', ['listFinanceEntries', 'getCashflow', 'getProfitLoss', 'listJournals'])  
126 PageHeader  title="Sổ thu chi" subtitle="Phiếu nháp → kiểm tra → ghi sổ. Phiếu đã ghi chỉ điều chỉnh có lịch sử."
126 MutationButton Tạo phiếu variant="contained"
126 Panel  
126 DataTable  
127 Button  
129 Button Chi tiết 
132 EditDialog  title={selectedEntry ? `Chứng từ ${selectedEntry.id}` : 'Đang tải chứng từ'}
132 Button Đóng 
132 MutationButton Sửa nháp 
132 MutationButton Ghi sổ 
132 MutationButton Đảo phiếu 
133 EditDialog  title={editing ? 'Sửa phiếu nháp' : 'Phiếu thu chi mới'} busy={create.pending || update.pending}
133 Button Lưu nháp variant="contained" disabled={create.pending || update.pending || !/^\d+(\.\d{1,4})?$/.test(amount) || codePointLength(description.trim()) < 5}
140 TextField  label="Loại phiếu"
140 TextField  label="Phân loại"
141 TextField  label={`Số tiền (${shop.currency})`}
141 TextField  label="Thời điểm ISO 8601" helperText="Ví dụ 2026-09-29T14:00:00Z; không tự suy múi giờ từ máy."
141 TextField  label="Diễn giải" minRows={2}
141 Alert Tiền mua hàng tồn kho không tự trở thành toàn bộ chi phí trong lợi nhuận. 
142 ConfirmDialog  title={selected?.action === 'post' ? 'Ghi sổ phiếu đã kiểm' : 'Đảo phiếu đã ghi'} busy={post.pending || reverse.pending} error={post.error || reverse.error}

## R22 Lợi nhuận quản trị

/s/:shopId/finance/profit-loss

### apps/web/src/modules/finance/index.tsx:144 ProfitLossPage

154 PageHeader  title="Lợi nhuận quản trị" subtitle="Số liệu do API tổng hợp từ nguồn giao dịch, không tính từ trang danh sách đang mở."
159 Stat  title="Doanh thu thuần"
160 Stat  title="Giá vốn"
161 Stat  title="Lãi gộp"
162 Stat  title="Lợi nhuận vận hành"
165 Panel  title="Chi tiết kết quả kinh doanh"
171 Alert  
173 Panel  title="Hỏi đáp có nguồn" subtitle="Giải thích giới hạn theo đúng snapshot đang hiển thị."
175 Alert Chế độ mô phỏng: câu trả lời theo mẫu cố định, chỉ đọc dữ liệu P&L API tổng hợp này; không gọi AI và không ghi sổ. 
177 TextField  label="Câu hỏi về báo cáo"
182 Button Tạo giải thích mô phỏng variant="contained" disabled={!currentKey}
186 Typography  
187 Typography Dữ liệu nguồn trong snapshot variant="subtitle2"
189 Alert  
190 Alert Hợp đồng getProfitLoss chưa trả về journal ID để drill-down; giao diện không tạo liên kết nguồn giả. 
193 Alert Chức năng giải thích chỉ có bản xem trước mô phỏng. API hiện chưa có operation hỏi đáp báo cáo. 
197 Alert Ngày bắt đầu phải trước ngày kết thúc. 

### apps/web/src/modules/finance/index.tsx:70 ReportRangeFields

72 TextField  type="date" label="Từ ngày"
73 TextField  type="date" label="Đến trước ngày"
74 Alert Khoảng [Từ, Đến); múi giờ . 

## R23 Nguồn kiến thức

/s/:shopId/knowledge

### apps/web/src/modules/knowledge/index.tsx:108 KnowledgePage

112 useCommand('createKnowledge', ['listKnowledge'])  
113 useCommand('uploadFile', [])  
117 PageHeader  title="Kiến thức cửa hàng" subtitle="Tri thức được duyệt riêng với hội thoại khách; giá và tồn lấy từ nguồn nghiệp vụ hiện hành."
117 MutationButton Thêm nguồn kiến thức variant="contained"
117 Alert Bản nháp đã được tạo, chưa xuất bản. 
117 RouteLink Mở nguồn vừa tạo to={`/s/${shop.id}/knowledge/${createdId}`}
117 Panel  
117 DataTable  
118 RouteLink  to={`/s/${shop.id}/knowledge/${r.id}`}
120 EditDialog  title="Nguồn kiến thức mới" busy={create.pending || upload.pending}
120 Button Lưu bản nháp variant="contained" disabled={!title.trim() || (!content.trim() && !file) || Boolean(fileError) || create.pending || upload.pending}
135 TextField  name="title" label={t('knowledge.form.title')}
135 TextField  name="content" label={t('knowledge.form.content')} minRows={8}
135 Button  variant="outlined"
135 Button Bỏ tệp 
135 Alert  
135 Alert Tệp chỉ là nguồn chưa tin cậy; bản tải lên không tự trở thành chỉ dẫn hay xuất bản. Cần kiểm tra, duyệt và đánh giá đúng phiên bản. 

### apps/web/src/modules/knowledge/index.tsx:88 ProductContentMockPreview

93 Panel  title="Nội dung sản phẩm · xem trước cục bộ" subtitle="Các thuộc tính mẫu chưa có trong DTO sản phẩm hiện hành."
95 Alert Bạn có thể rà soát nội dung, kích cỡ, bảo hành, sản phẩm thay thế và điều không được hứa. “Lưu bản xem trước” chỉ giữ state trong trang này; không gửi API và sẽ mất khi tải lại. 
96 TextField  label="Tên sản phẩm mẫu"
97 TextField  label={field.label} minRows={field.key === 'features' || field.key === 'forbiddenPromises' ? 2 : 1}
98 Button Lưu bản xem trước (chỉ trên trang này) variant="outlined" disabled={!valid || !hasChanges}
100 Typography  variant="subtitle1"
102 Alert Bản xem trước chưa được duyệt; không dùng làm lời hứa bán hàng hoặc dữ liệu đã lưu. 

### apps/web/src/modules/knowledge/index.tsx:22 CurrentCatalogSources

38 Panel  title="Nguồn dữ liệu giá và tồn" subtitle="Giá lấy từ danh mục sản phẩm; số lượng lấy từ snapshot kho theo từng biến thể."
40 Alert Nguồn API được truy vấn riêng với nội dung tri thức. Trong chế độ demo, đây là dữ liệu tổng hợp; thời điểm snapshot được hiển thị để người nghiệm thu đối chiếu. 
42 Alert Cần quyền xem sản phẩm và tồn kho để đối chiếu nguồn giá/tồn hiện hành. 
44 DataTable  label="Nguồn giá và snapshot tồn kho" empty="Chưa có biến thể đang bán để đối chiếu."
45 RouteLink  to={`/s/${shop.id}/products/${row.product.id}`}
45 Typography  variant="caption"
52 Typography Bản đối chiếu giới hạn ở 100 sản phẩm và 100 snapshot đầu tiên. Mở Sản phẩm hoặc Tồn kho để tra cứu đầy đủ. variant="caption"
54 RouteLink Mở danh sách sản phẩm to={`/s/${shop.id}/products`}
55 RouteLink Mở danh sách tồn kho to={`/s/${shop.id}/inventory`}

## R24 Chi tiết kiến thức

/s/:shopId/knowledge/:knowledgeId

### apps/web/src/modules/knowledge/index.tsx:137 KnowledgeDetailPage

145 useCommand('updateKnowledge', ['getKnowledge', 'listKnowledge', 'listKnowledgeRevisions'])  
146 useCommand('createKnowledgeRevision', ['getKnowledge', 'listKnowledge', 'listKnowledgeRevisions'])  
147 useCommand('submitKnowledgeReview', ['getKnowledge', 'listKnowledge'])  
148 useCommand('publishKnowledge', ['getKnowledge', 'listKnowledge', 'listKnowledgeRevisions'])  
149 useCommand('retireKnowledge', ['getKnowledge', 'listKnowledge'])  
150 useCommand('restoreKnowledgeRevision', ['getKnowledge', 'listKnowledgeRevisions'])  
153 PageHeader  title={k?.title || 'Chi tiết kiến thức'} subtitle="Lịch sử phiên bản không bị thay bởi nội dung hiện tại."
153 RouteLink Tất cả nguồn to={`/s/${shop.id}/knowledge`}
153 Panel  title="Nội dung & nguồn"
153 Typography  
153 Alert  
153 MutationButton  
153 MutationButton Gửi duyệt disabled={k.status === 'published' || k.status === 'processing'}
153 MutationButton Xuất bản bản đã đánh giá disabled={k.status !== 'ready_for_review'} variant="contained"
153 MutationButton Ngừng sử dụng disabled={k.status !== 'published'}
153 Panel  title="Lịch sử phiên bản"
153 DataTable  
154 Button Xem / khôi phục nháp 
156 EditDialog  title={mode === 'revision' ? 'Soạn phiên bản mới' : 'Sửa nháp'} busy={update.pending || createRevision.pending}
156 Button Lưu nháp variant="contained" disabled={!edit || !title.trim() || !content.trim() || update.pending || createRevision.pending}
165 TextField  label="Tiêu đề"
165 TextField  label="Nội dung" minRows={10}
166 ConfirmDialog  title="Gửi nguồn kiến thức để duyệt" error={review.error} busy={review.pending}
166 ConfirmDialog  title="Ngừng sử dụng kiến thức" error={retire.error} busy={retire.pending}
167 EditDialog  title="Xuất bản kiến thức" busy={publish.pending}
167 Button Xuất bản variant="contained" disabled={!evalId.trim() || codePointLength(reason.trim()) < 5 || !k?.draftRevisionId || publish.pending}
171 TextField  label="Mã lần đánh giá đúng phiên bản"
171 TextField  label="Lý do xuất bản"
171 RouteLink Xem đánh giá to={`/s/${shop.id}/bot/evaluations`}
172 EditDialog  title={`Phiên bản #${revision?.revision || ''}`} busy={restore.pending}
172 MutationButton Khôi phục thành nháp busy={restore.pending} disabled={codePointLength(restoreReason.trim()) < 5}
177 Typography Đang tải nội dung phiên bản… 
177 Typography  
177 TextField  label="Lý do khôi phục" helperText="Tối thiểu 5 ký tự; bản đã xuất bản không bị sửa."
177 Alert Khôi phục tạo bản nháp mới, không tự đổi bản đang chạy. Cần đánh giá và duyệt lại. 

## R25 Đánh giá và phản hồi

/s/:shopId/knowledge/review

### apps/web/src/modules/knowledge/index.tsx:179 FeedbackPage

181 useCommand('reviewFeedback', ['listFeedback', 'listKnowledge'])  
183 PageHeader  title="Duyệt phản hồi AI" subtitle="Ẩn thông tin cá nhân, kiểm nội dung sửa, rồi mới tạo tri thức nháp."
183 Panel  
183 DataTable  
186 MutationButton Duyệt nội dung disabled={r.status !== 'pending'}
188 EditDialog  title="Kiểm tra phản hồi" busy={review.pending}
188 Button Lưu kết quả variant="contained" disabled={codePointLength(reason.trim()) < 5 || review.pending || (decision === 'approve' && !correction.trim())}
192 Button Chấp nhận đề xuất variant={decision === 'approve' ? 'contained' : 'outlined'}
192 Button Từ chối variant={decision === 'reject' ? 'contained' : 'outlined'}
192 TextField  label="Nội dung đã loại dữ liệu riêng tư" minRows={6} helperText="Kiểm tra và tự loại PII trước khi chấp nhận; nội dung này được lưu vào bản nháp."
192 TextField  label="Lý do"
192 Alert Chấp nhận phản hồi chỉ tạo bản nháp và revision; không tự huấn luyện hoặc xuất bản AI. 

## R26 Cấu hình bot

/s/:shopId/bot

### apps/web/src/modules/bot/index.tsx:11 BotConfigPage

16 useCommand('updateBotDraft', ['getBotConfig', 'listBotRevisions'])  
17 useCommand('publishBotConfig', ['getBotConfig'])  
18 useCommand('pauseBot', ['getBotConfig'])  
19 useCommand('restoreBotRevision', ['getBotConfig', 'listBotRevisions'])  
22 PageHeader  title="Điều khiển Admin AI" subtitle="Tách cấu hình đang chạy và cấu hình đang soạn. Không bật tự động chỉ vì lưu prompt."
22 RouteLink Thử bot to={`/s/${shop.id}/bot/playground`}
22 Panel  title="Cấu hình hiện hành"
22 Typography  
22 Alert Hợp đồng BotConfigWrite hiện khóa . Quyền tự chốt đơn theo chính sách nghiệp vụ do backend quản lý riêng, không bật bằng cách đổi boolean ở đây. 
22 MutationButton Sửa bản nháp 
22 MutationButton Duyệt & xuất bản variant="contained"
22 MutationButton Tạm dừng bot 
22 Panel  title="Các phiên bản"
22 DataTable  
25 MutationButton Khôi phục vào nháp 
28 EditDialog  title="Cấu hình bản nháp" busy={update.pending}
28 Button Lưu nháp variant="contained" disabled={!editing || !instructions || !connection || !budget || update.pending}
35 TextField  label="Kết nối AI"
35 TextField  label="Chỉ dẫn tư vấn đã duyệt" minRows={8}
35 TextField  label="Mã phiên bản kiến thức (mỗi dòng một mã)" minRows={3}
35 TextField  label={`Ngân sách ngày (${shop.currency})`}
35 TextField  type="number" label="Số bước công cụ tối đa"
36 EditDialog  title="Xuất bản cấu hình đã đánh giá" busy={publish.pending}
36 Button Xuất bản variant="contained" disabled={!evalId || codePointLength(reason) < 5 || publish.pending}
40 TextField  label="Mã lần đánh giá đúng bản nháp"
40 TextField  label="Lý do"
40 RouteLink Xem kết quả kiểm thử to={`/s/${shop.id}/bot/evaluations`}
41 ConfirmDialog  title="Tạm dừng Admin AI" busy={pause.pending} error={pause.error}
41 ConfirmDialog  title="Khôi phục bản cũ vào nháp" busy={restore.pending} error={restore.error}

## R27 Thử bot an toàn

/s/:shopId/bot/playground

### apps/web/src/modules/bot/index.tsx:43 PlaygroundPage

45 useCommand('runPlayground', [])  
47 PageHeader  title="Phòng thử bot" subtitle="Thử cấu hình hiện tại mà không gửi tin cho khách hàng."
47 Panel  title="Câu hỏi thử"
51 Alert Phòng thử dùng bản nháp # · . Nội dung thử không gửi ra ngoài. 
51 TextField  label="Nội dung khách hỏi" minRows={9}
51 TextField  label="Mã khách để thử ngữ cảnh (tùy chọn)"
51 MutationButton Chạy thử type="submit" variant="contained" busy={run.pending} disabled={!text.trim() || !config.data}
51 Panel  title="Kết quả có nguồn"
51 Typography  
51 Typography Nguồn variant="subtitle2"
51 Alert  
51 Typography Chạy câu hỏi để xem câu trả lời, nguồn và cảnh báo. Không có điểm chất lượng tự tạo. 

## R28 Kiểm thử chất lượng AI

/s/:shopId/bot/evaluations

### apps/web/src/modules/bot/index.tsx:53 EvaluationsPage

57 useCommand('createEvaluation', ['listEvaluations'])  
59 PageHeader  title="Đánh giá AI" subtitle="Kết quả gắn cấu hình, dữ liệu kiểm thử và phiên bản kiến thức."
59 MutationButton Chạy đánh giá variant="contained"
59 Alert Chế độ mô phỏng chỉ kiểm quy trình, không đánh giá chất lượng mô hình AI thật. 
59 Panel  
59 DataTable  
60 Button  
62 EditDialog  title="Đánh giá cấu hình nháp" busy={create.pending}
62 Button Bắt đầu variant="contained" disabled={!dataset || !bot.data || create.pending}
67 TextField  label="Phiên bản bộ kiểm thử đã đăng ký"
67 TextField  label="Mã bản kiến thức (tùy chọn)"
67 Alert Mã bộ kiểm thử phải do backend xác minh. Không tự gọi tỷ lệ 100% là chứng nhận chất lượng. 
67 EditDialog  title="Chi tiết đánh giá"
67 Button Đóng 
67 RouteLink Báo cáo chi tiết to={`/s/${shop.id}/jobs/${selected.reportJobId}`}

## R29 Kết nối Facebook

/s/:shopId/integrations/channels

### apps/web/src/modules/integrations/index.tsx:13 ChannelsPage

16 useCommand('beginChannelConnect', [])  
16 useCommand('reconnectChannel', [])  
16 useCommand('disconnectChannel', ['listChannels'])  
16 useCommand('checkChannelHealth', ['listChannels'])  
19 MutationButton Kết nối Page variant="contained" busy={connect.pending}
28 PageHeader  title="Kết nối Facebook" subtitle="Kết nối bằng luồng cấp quyền. Page token chỉ được giữ ở backend."
28 Alert Đây là mô phỏng. Không đăng nhập Facebook và không gửi tin thật. 
28 Empty  
28 Panel  title={c.name}
28 Alert  
28 MutationButton Kiểm kết nối busy={check.pending}
31 MutationButton Kết nối lại busy={reconnect.pending}
31 MutationButton Ngắt kết nối 
31 RouteLink Xem kết quả kiểm tra to={`/s/${shop.id}/jobs/${jobId}`}
31 ConfirmDialog  title="Ngắt kết nối Page" busy={disconnect.pending} error={disconnect.error}

## R30 Nhà cung cấp AI

/s/:shopId/integrations/ai

### apps/web/src/modules/integrations/index.tsx:33 AIProvidersPage

36 useCommand('createAIConnection', ['listAIConnections'])  
36 useCommand('updateAIConnection', ['listAIConnections'])  
36 useCommand('deleteAIConnection', ['listAIConnections'])  
36 useCommand('testAIConnection', ['listAIConnections'])  
40 MutationButton Thêm kết nối AI variant="contained"
42 PageHeader  title="Nhà cung cấp AI" subtitle="Mỗi adapter công bố khả năng; không giả định mọi API key có thể thay thế nhau."
42 Empty  
42 Panel  title={c.name}
42 MutationButton Sửa / xoay khóa 
42 MutationButton Kiểm kết nối busy={test.pending}
45 MutationButton Xóa 
45 RouteLink Kết quả kiểm tra kết nối to={`/s/${shop.id}/jobs/${jobId}`}
46 EditDialog  title={editing ? 'Sửa kết nối / xoay khóa' : 'Kết nối AI mới'} busy={create.pending || update.pending}
46 Button Lưu cấu hình variant="contained" disabled={!name.trim() || !model.trim() || (!editing && (!descriptor || !key)) || create.pending || update.pending}
65 Alert Không nhập khóa thật. Dùng demo-key; request mô phỏng chỉ kiểm tra giao diện, không giữ khóa và không kết nối AI thật. 
65 TextField  label="Tên kết nối"
65 TextField  label="Provider đã có adapter" disabled={!!editing}
65 TextField  label="Model ID được adapter hỗ trợ" helperText={descriptor?.models.map(m => m.modelId).join(', ') || 'Xem catalog từ backend'}
65 TextField  label="Endpoint HTTPS được backend cho phép"
65 TextField  label={editing ? 'Khóa mới (để trống để giữ nguyên)' : 'Khóa API'} type="password"
65 Alert Secret chỉ được gửi theo trường writeOnly của contract. Response và danh sách không trả secret gốc. 
66 ConfirmDialog  title="Xóa kết nối AI" error={remove.error} busy={remove.pending}

## R31 Báo cáo và xuất dữ liệu

/s/:shopId/reports

### apps/web/src/modules/reports/index.tsx:47 ReportsPage

61 useCommand('createExport', ['listJobs'])  
154 PageHeader  title="Báo cáo & xuất dữ liệu" subtitle="Xuất snapshot do API tạo; số liệu tổng hợp không được tính từ một trang danh sách."
158 Panel  title="Tạo tệp báo cáo" subtitle="Ngày được hiểu theo múi giờ cửa hàng và gửi thành mốc thời gian rõ ràng."
161 Alert  
162 TextField  label="Báo cáo"
169 Alert Vai trò hiện tại chưa có loại báo cáo khả dụng. 
171 TextField  label="Từ ngày" type="date"
172 TextField  label="Đến ngày" type="date"
176 Alert Vai trò hiện tại không có quyền reports.export. 
177 Alert Quyền xuất không thay thế quyền đọc nguồn ; loại báo cáo này chưa thể xuất. 
178 Alert API không liệt kê loại báo cáo này cho vai trò hiện tại. 
179 Button  variant="contained" disabled={!canExportReports || !canExportSource || !reportAvailable || !snapshotAsOf || !from || !to || from > to || run.pending}
183 RouteLink Theo dõi công việc to={`/s/${shop.id}/jobs/${lastExport.job.id}`}
185 Alert Tệp chỉ được tải khi công việc xác nhận succeeded. 
186 Alert URL tải không hợp lệ hoặc chưa thuộc HTTPS/nguồn hiện tại. 
188 Alert  
189 Alert API hiện chỉ trả danh sách loại báo cáo và thời điểm snapshot; bộ lọc ngày áp dụng cho lệnh xuất. Không có series hoặc tổng số liệu để giao diện tự suy ra. 
194 Panel  title="Công việc gần đây" subtitle="Trạng thái và tiến độ lấy từ API; trang hiện tại có thể chứa nhiều loại công việc."
195 DataTable  label="Công việc gần đây" empty="Chưa có công việc trong trang này."
196 RouteLink  to={`/s/${shop.id}/jobs/${job.id}`}
204 Alert Vai trò hiện tại không có jobs.read; trạng thái công việc được ẩn theo quyền. 
206 Panel  title="Phạm vi dữ liệu" subtitle="Chỉ những gì API cung cấp mới được trình bày như số liệu."
208 Typography Báo cáo dòng, biểu đồ và tổng hợp theo khoảng ngày chưa có trong getReportSummary. Frontend không cộng dữ liệu phân trang để tạo KPI thay thế. 
209 Typography Trạng thái export được lấy riêng từ listJobs; URL tải chỉ được mở sau khi API trả về công việc hoàn tất. 
210 RouteLink Xem thông tin marketing to={`/s/${shop.id}/reports/marketing`}

## R32 Nhân sự và quyền

/s/:shopId/settings/team

### apps/web/src/modules/workspace/index.tsx:153 TeamPage

156 useCommand('inviteMember', ['listMembers'])  
157 useCommand('updateMemberRoles', ['listMembers'])  
158 useCommand('revokeMembership', ['listMembers'])  
161 PageHeader  title="Nhân sự & phân quyền" subtitle="Vai trò là bộ quyền mặc định; API quyết định quyền hiệu lực ở từng thao tác."
161 MutationButton Mời nhân viên variant="contained"
161 Panel  
161 DataTable  
164 MutationButton Sửa quyền 
164 MutationButton Thu hồi disabled={m.userId === session.user.id || m.status === 'revoked'}
167 EditDialog  title={edit ? 'Cập nhật quyền' : 'Mời nhân viên'} busy={invite.pending || update.pending}
167 Button Lưu variant="contained" disabled={!roles.length || (!edit && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) || invite.pending || update.pending}
174 TextField  label="Email nhân viên" type="email"
174 Typography Phân vai trò variant="subtitle2"
174 Alert Quyền mới phải được máy chủ kiểm lại. Thu hồi quyền làm mất hiệu lực cache và phiên truy cập liên quan. 
174 ConfirmDialog  title="Thu hồi quyền nhân viên" busy={revoke.pending} error={revoke.error}

## R33 Thiết lập cửa hàng

/s/:shopId/settings/shop

### apps/web/src/modules/workspace/index.tsx:77 ShopSettingsPage

82 useCommand('updateShop', ['getShop'])  
109 PageHeader  title="Thiết lập cửa hàng" subtitle="Cấu hình riêng của shop không thay đổi quy tắc AI lập trình hoặc màu đã duyệt."
111 Panel  title="Thông tin cơ sở"
115 Alert Đã lưu cấu hình cửa hàng. 
117 TextField  label="Tên cửa hàng" disabled={!canManageShop}
118 TextField  label="Tiền tệ cơ sở" helperText="Không đổi tiền tệ bằng sửa giao diện. Cần kế hoạch chuyển đổi dữ liệu."
121 TextField  label="Múi giờ" disabled={!canManageShop}
122 TextField  label="Ngôn ngữ" disabled={!canManageShop}
124 TextField  label="Giao diện"
125 MutationButton Lưu cấu hình type="submit" variant="contained" busy={update.pending} disabled={!name.trim() || !timezone}
128 Panel  title="Checklist thiết lập vận hành" subtitle="Các mục không có trường API được giữ ở trạng thái chưa xác minh; không suy diễn đã sẵn sàng."
130 Alert Quốc gia kinh doanh không được suy ra từ múi giờ. 

### apps/web/src/modules/workspace/index.tsx:144 SetupChecklistItem

146 Typography  
146 Typography  variant="body2"
147 RouteLink  to={to}

## R34 Nhật ký kiểm toán

/s/:shopId/settings/audit

### apps/web/src/modules/workspace/index.tsx:179 AuditPage

179 PageHeader  title="Nhật ký hoạt động" subtitle="Ai thực hiện, thao tác nào, dữ liệu nào và mã truy vết. Không lưu API key hoặc suy luận riêng của AI."
179 Alert API hiện trả về người thực hiện, thao tác, đối tượng, thời gian, mã truy vết và tóm tắt. Loại actor, phiên bản policy/config và snapshot chi tiết chưa có trong DTO nên không được suy đoán. 
179 Panel  
179 DataTable  
180 Typography  variant="caption"

## R35 Quyền riêng tư và lưu trữ

/s/:shopId/settings/privacy

### apps/web/src/modules/workspace/index.tsx:182 PrivacyPage

186 useCommand('updatePrivacyPolicy', ['getPrivacyPolicy'])  
187 useCommand('createPrivacyRequest', ['listPrivacyRequests'])  
220 PageHeader  title="Quyền riêng tư & vòng đời dữ liệu" subtitle="Tách cấu hình nháp với chính sách được duyệt; yêu cầu xóa không tự vượt điều kiện lưu chứng từ."
220 Panel  title="Chính sách lưu trữ"
220 TextField  label="Số ngày lưu hội thoại" type="number" error={!!daysError} helperText={daysError}
220 TextField  label="Căn cứ / thị trường áp dụng" minRows={4} error={!!noteError} helperText={noteError}
220 MutationButton Lưu bản nháp chính sách variant="contained" busy={save.pending} disabled={!policy.data || !editor.dirty || !!daysError || !!noteError}
220 Alert Không tự chứng nhận tuân thủ pháp luật. Phê duyệt yêu cầu xóa cần xác thực nâng cao của backend; luồng OIDC step-up chưa được xác minh trong frontend này. 
220 Panel  title="Yêu cầu của khách"
220 MutationButton Tạo yêu cầu 
220 DataTable  
223 EditDialog  title="Yêu cầu dữ liệu cá nhân" busy={create.pending}
223 Button Tạo yêu cầu chờ duyệt variant="contained" disabled={!customerId || codePointLength(reason.trim()) < 5 || create.pending}
227 TextField  label="Tìm khách hàng" disabled={!canReadCustomers} helperText="Tìm theo mã hoặc tên khách; API hỗ trợ tìm kiếm và cursor."
227 TextField  label="Khách hàng" disabled={!canReadCustomers || (customers.isPending && !customers.data)}
227 Button Thử lại danh sách khách 
227 TextField  label="Loại yêu cầu"
227 TextField  label="Lý do / xác minh yêu cầu" minRows={3}

### apps/web/src/modules/workspace/index.tsx:230 ContactConsentPreview

236 Panel  title="Xem thử consent marketing"
238 Alert Dữ liệu tổng hợp chỉ dùng để xem tương tác UI. Danh sách này gồm tối đa khách đã tải, không phải toàn bộ khách của cửa hàng. Contract Customer chưa có trường consent và API chưa có thao tác opt-out; lựa chọn ở đây không gửi tới backend hoặc chặn chiến dịch thật. 
239 Button Mở danh sách khách đầy đủ to={`/s/${shopId}/customers`}
241 TextField  label="Khách mẫu" disabled={!customer}
249 Typography Số khách opt-out trong preview: . Không khẳng định đã lọc job đang chờ hoặc dữ liệu khôi phục. variant="body2"
251 Alert Chưa có khách mẫu trong trang API hiện tại. 
252 Alert Vai trò hiện tại không có customers.read; khách mẫu và lựa chọn consent được ẩn. 

## R36 Theo dõi công việc nền

/s/:shopId/jobs/:jobId

### apps/web/src/modules/workspace/index.tsx:256 JobPage

266 PageHeader  title={`Công việc ${jobId}`} subtitle="Theo dõi tiến độ từ API. Được tiếp nhận không có nghĩa đã hoàn tất."
266 Panel  title="Kết quả xử lý"
266 DataTable  
266 Button Kiểm tra lại variant="outlined"
266 Button Mở kết quả xuất variant="contained"
266 Alert URL tải không an toàn hoặc không hợp lệ nên đã bị chặn. 
266 RouteLink Xem và xác nhận nhập to={`/s/${shop.id}/imports/${job.id}`}

## R37 Điều hành và công việc

/s/:shopId/operations

### apps/web/src/modules/operations/index.tsx:23 OperationsPage

27 useCommand('claimWorkItem', ['listWorkItems', 'listPrepJobs', 'getOperationsSummary'])  
28 useCommand('updateWorkItem', ['listWorkItems', 'getOperationsSummary'])  
54 PageHeader  title="Công việc hôm nay" subtitle="Giao việc → nhận việc → hoàn thành → kiểm tra kết quả."
55 Alert Dữ liệu vận hành và trạng thái dịch vụ đang được mô phỏng; chưa xác minh worker hoặc backend thật. 
58 Stat  title="Chưa có người nhận"
59 Stat  title="Quá hạn"
60 Stat  title="Chờ phê duyệt"
61 Stat  title="Kết quả chưa rõ"
65 Panel  
69 Typography Giám sát ngoại lệ 
70 Typography Quá hạn theo thời điểm API; gồm việc bị chặn, chưa nhận, đến hạn hoặc sai lệch thanh toán. Chỉ lọc trang dữ liệu hiện đang tải. variant="body2"
72 Button  variant={exceptionsOnly ? 'contained' : 'outlined'}
76 Alert Không có ngoại lệ trong trang dữ liệu hiện tại. 
81 DataTable  
84 Typography  
85 Typography · variant="caption"
96 MutationButton Tôi nhận việc busy={claim.pending}
97 RouteLink Chuẩn bị hàng to={`/s/${shop.id}/fulfillment`}
98 MutationButton Cập nhật 
105 Typography Được phép: variant="caption"
114 EditDialog  title="Cập nhật công việc" busy={update.pending}
114 Button Lưu kết quả variant="contained" disabled={!item || !availableActions.includes(action) || codePointLength(reason.trim()) < 5 || (action === 'reassign' && !assignee) || update.pending}
124 Typography  
125 TextField  label="Hành động được phép"
129 TextField  label="Tìm thành viên đang hoạt động" disabled={!canManageMembers} helperText="Tìm kiếm dùng q của listMembers; trang tiếp dùng cursor."
130 TextField  label="Người phụ trách" disabled={!canManageMembers || (members.isPending && !members.data)}
135 Button Thử lại danh sách thành viên 
137 TextField  label="Kết quả / lý do" minRows={3}

## R38 Hàng chờ phê duyệt

/s/:shopId/approvals

### apps/web/src/modules/operations/index.tsx:143 ApprovalsPage

151 useCommand('decideApproval', ['getApproval', 'listApprovals', 'listPurchaseOrders', 'getOperationsSummary'])  
160 PageHeader  title="Cần phê duyệt" subtitle="Quyết định gắn với đúng nội dung, phiên bản và hạn hiệu lực — không phải một nút đồng ý chung."
162 Panel  title="Xem thử ủy quyền" subtitle="Bản xem trước cục bộ để nghiệm thu giao diện; không cấp quyền hiệu lực."
163 Alert Contract hiện chưa có thao tác tạo quy tắc ủy quyền. Hạn mức và phạm vi bên dưới chỉ là dữ liệu mẫu, không thay đổi người duyệt hoặc quyền quyết định. 
165 TextField  label="Vai trò được ủy quyền"
170 TextField  label="Hạn mức mẫu (VND)" type="number"
173 Button Tạo bản xem thử variant="outlined" disabled={!delegateLimit || Number(delegateLimit) < 1}
176 Typography Ủy quyền mô phỏng: · tối đa VND. variant="body2"
177 Typography Không ghi API, không nâng scope và không cho phép người nhận tự duyệt quyết định của mình. variant="caption"
180 Panel  
184 DataTable  
185 Typography  
185 Typography · variant="caption"
190 MutationButton Xem & quyết định disabled={entry.status !== 'pending'}
203 EditDialog  title="Xem xét phê duyệt" busy={decide.pending}
203 MutationButton  variant="contained" busy={decide.pending} disabled={!approval || detail.isPending || approval.status !== 'pending' || expired || codePointLength(reason.trim()) < 5}
214 Alert Thay đổi giá, số lượng, đối tượng hoặc quyền có thể làm phê duyệt hết hiệu lực. Im lặng không được coi là đồng ý. 
215 Alert Không xác minh được thời điểm hiện tại từ API; không thể gửi quyết định an toàn. 
216 Alert Phê duyệt đã hết hạn; cần xin phê duyệt mới trước khi tiếp tục. 
217 Alert Phê duyệt hiện ở trạng thái “ ”; không thể quyết định lại. 
226 Typography Hash nội dung: variant="caption"
227 TextField  label="Quyết định" disabled={approval.status !== 'pending' || expired}
231 TextField  label="Lý do quyết định" minRows={3} disabled={approval.status !== 'pending' || expired}

## R39 Trung tâm thông báo

/s/:shopId/notifications

### apps/web/src/modules/notifications/index.tsx:19 NotificationsPage

22 useCommand('acknowledgeNotification', ['listNotifications', 'listWorkItems', 'listPrepJobs', 'getOperationsSummary'])  
23 PageHeader  title="Trung tâm thông báo" subtitle="Đã gửi không đồng nghĩa đã đọc. Nhận việc là một xác nhận riêng."
23 RouteLink Điện thoại & lịch trực to={`/s/${shop.id}/notifications/devices`}
23 Panel  
25 Typography  variant="h6"
25 Typography  
25 Typography · variant="caption"
25 Typography  variant="caption"
25 MutationButton Tôi nhận chuẩn bị đơn disabled={!n.workItemId || n.recipientUserId !== session.user.id} busy={ack.pending} variant="contained"
25 RouteLink Xem đơn to={`/s/${shop.id}/orders/${n.source.id}`}
25 Alert Chưa có thông báo. Thông báo chuẩn bị được tạo sau khi đơn đã xác nhận và giữ hàng thành công. 

## R40 Thiết bị, kênh nhận và lịch trực

/s/:shopId/notifications/devices

### apps/web/src/modules/notifications/index.tsx:46 DevicesPage

57 useCommand('createDevice', ['listDevices'])  
58 useCommand('testDevice', ['listDevices', 'listNotifications'])  
59 useCommand('revokeDevice', ['listDevices'])  
60 useCommand('updateNotificationPolicy', ['getNotificationPolicy'])  
61 useCommand('beginTelegramPairing', [])  
115 PageHeader  title="Điện thoại & lịch trực" subtitle="Thiết bị, xác nhận nhận việc, giờ yên lặng và người dự phòng."
115 Panel  title="Thiết bị nhận thông báo"
115 Alert  
115 Typography Thông báo tối giản trên màn hình khóa; xem địa chỉ khách sau khi đăng nhập. 
115 TextField  label="Tên thiết bị"
115 MutationButton  variant="contained" busy={pending} disabled={!deviceName.trim()}
115 Alert Mô phỏng không yêu cầu quyền hệ điều hành, không đăng ký Push thật và giữ thiết bị ở trạng thái chờ xác minh. 
115 DataTable  
118 MutationButton  disabled={d.status === 'revoked'} busy={test.pending}
118 MutationButton Thu hồi disabled={d.status === 'revoked'}
120 Button Thử lại danh sách thiết bị 
120 Panel  title="Telegram dự phòng"
120 Typography Chỉ liên kết qua mã một lần. Không dán bot token vào trình duyệt. 
120 MutationButton Tạo mã liên kết variant="outlined" busy={pair.pending}
124 Alert Bot: Mã: Hết hạn 
124 Panel  title="Quy tắc nhận và nhắc việc"
124 TextField  label="Nhắc sau (phút), để trống nếu chưa chốt" type="number"
124 TextField  label="Số lần nhắc tối đa" type="number"
124 TextField  label="Tìm thành viên" disabled={!canManageMembers} helperText="Tìm kiếm dùng q của listMembers; mã người nhận đã lưu luôn được giữ."
124 TextField  label="Người nhận chính"
124 TextField  label="Người dự phòng"
124 Button Thử lại danh sách thành viên 
124 Alert  
124 TextField  label="Kênh dự phòng"
124 Alert Mã ghép đôi mô phỏng không liên kết Telegram. Chỉ chọn kênh này khi danh sách có thiết bị Telegram active. 
124 TextField  type="time" label="Từ"
124 TextField  type="time" label="Đến"
124 Typography Theo múi giờ variant="caption"
124 Alert  
124 MutationButton Lưu quy tắc variant="contained" busy={save.pending} disabled={!policy.data || !!policyError || save.pending}
124 Alert Chống gửi lặp theo sự kiện, kiểm tra callback, thời hạn token và giới hạn tốc độ phải được bảo đảm bởi dịch vụ. Bản demo không phát thông báo thật và không xác minh các lớp bảo vệ phía máy chủ. 
124 ConfirmDialog  title="Thu hồi thiết bị" busy={revoke.pending} error={revoke.error}

## R41 Chuẩn bị và lấy hàng

/s/:shopId/fulfillment

### apps/web/src/modules/fulfillment/index.tsx:24 FulfillmentPage

31 PageHeader  title="Chuẩn bị hàng" subtitle="Nhận việc, lấy đúng SKU, kiểm đủ số lượng rồi đóng gói."
31 RouteLink Vận đơn & bàn giao to={`/s/${shop.id}/shipments`}
32 Panel  
36 DataTable  
37 RouteLink  to={`/s/${shop.id}/orders/${prep.orderId}`}
41 Button Mở phiếu lấy hàng variant="outlined"

### apps/web/src/modules/fulfillment/index.tsx:51 PrepDialog

57 useCommand('claimWorkItem', ['getWorkItem', 'getPrepJob', 'listWorkItems', 'listPrepJobs'])  
58 useCommand('pickPrepLine', ['getPrepJob', 'listPrepJobs'])  
59 useCommand('packPrepJob', ['getPrepJob', 'listPrepJobs', 'getOrder', 'listOrders'])  
74 EditDialog  title={`Phiếu chuẩn bị ${prep?.orderId || ''}`} busy={pick.pending || claim.pending}
74 Button Đóng disabled={busy}
80 RouteLink Chi tiết đơn to={`/s/${shop.id}/orders/${prep.orderId}`}
82 MutationButton Tôi nhận chuẩn bị đơn variant="contained" busy={claim.pending} disabled={!workItem || workItem.state !== 'queued' || !!workItem.assigneeUserId}
95 Alert Vai trò hiện tại không có quyền nhận công việc chuẩn bị này. 
96 Alert Công việc đã đổi trạng thái hoặc đã có người nhận. Tải lại phiếu để xem người phụ trách mới. 
97 Button Tải lại trạng thái 
98 Alert Phiếu đang do phụ trách. 
111 Typography  
112 Typography / 
114 Alert Dòng hàng còn vấn đề cần xử lý. 
116 TextField  label="Nhập/quét SKU thực tế" disabled={!canEdit}
117 TextField  label="Số lượng đã lấy" type="number" error={!quantityIsValid} helperText={!quantityIsValid ? `Nhập số nguyên từ 0 đến ${line.requiredQuantity}.` : undefined} disabled={!canEdit}
127 TextField  label="Vấn đề phát hiện (để trống khi đạt)" disabled={!canEdit}
128 MutationButton Xác nhận dòng đã kiểm busy={pick.pending} disabled={!canEdit || !scan.trim() || !quantityIsValid || codePointLength(issue) > 1000}
143 MutationButton Xác nhận đã đóng gói variant="contained" disabled={!assigned || prep.state !== 'picking' || !prep.lines.every(line => line.pickedQuantity === line.requiredQuantity && !line.hasIssue)}
149 Alert Chưa thể đóng gói: cần lấy đủ từng dòng và xử lý mọi vấn đề trước. 
150 RouteLink Tạo vận đơn để bàn giao to={`/s/${shop.id}/shipments?orderId=${prep.orderId}`}
151 Alert Các nút lấy/đóng gói là xác nhận của người thật. Hệ thống không tự nhận công việc vật lý đã hoàn tất. 
155 ConfirmDialog  title="Hoàn tất đóng gói" busy={pack.pending} error={pack.error}

## R42 Vận đơn và giao hàng

/s/:shopId/shipments

### apps/web/src/modules/fulfillment/index.tsx:167 ShipmentsPage

178 useCommand('createShipment', ['listShipments', 'listOrders'])  
179 useCommand('handoverShipment', ['getShipment', 'listShipments', 'listOrders', 'listStockSnapshots', 'listStockMovements', 'listPrepJobs', 'listWorkItems'])  
180 useCommand('recordShipmentEvent', ['getShipment', 'listShipments', 'listOrders', 'listDebtItems', 'getProfitLoss', 'getDashboard'])  
233 PageHeader  title="Vận đơn & giao hàng" subtitle="Bàn giao hàng, khách nhận hàng và tiền về là ba sự kiện khác nhau."
233 MutationButton Tạo vận đơn variant="contained"
235 Panel  title="Phí & vùng giao hàng"
235 Alert API hiện chỉ trả phí báo giá/thực tế nếu đã có trên vận đơn; chưa có operation để kiểm tra vùng giao hoặc xin báo giá mới. 
236 Panel  
240 DataTable  
241 Typography  
241 Typography  variant="caption"
242 RouteLink  to={`/s/${shop.id}/orders/${item.orderId}`}
247 Button Chi tiết 
248 MutationButton Bàn giao disabled={!['planned', 'label_ready'].includes(item.state)}
249 MutationButton Cập nhật hành trình disabled={['planned', 'cancelled', 'returned'].includes(item.state)}
258 EditDialog  title="Tạo vận đơn" busy={create.pending}
263 Button Tạo bản vận chuyển variant="contained" disabled={!orderId || create.pending || selectedOrder?.fulfillmentState !== 'packed'}
275 TextField  label="Tìm đơn hàng" helperText="Tìm theo mã đơn; kết quả tải theo cursor từ API."
276 TextField  label="Đơn đã đóng gói" disabled={orders.isPending && !orders.data}
281 Button Thử lại danh sách đơn 
283 Alert Đơn đã chọn chưa ở trạng thái đã đóng gói nên chưa thể tạo vận đơn. 
284 TextField  label="Mã đơn vị vận chuyển (trống = thủ công)"
285 Alert Vận đơn/nhãn in của nhà vận chuyển chỉ xuất hiện khi backend có adapter đã được cấp quyền. Không tự tạo mã giao hàng thật. 
289 EditDialog  title={dialogMode === 'handover' ? 'Xác nhận bàn giao kiện hàng' : dialogMode === 'event' ? 'Cập nhật hành trình có bằng chứng' : 'Chi tiết vận đơn'} busy={handover.pending || event.pending}
296 Button  
297 MutationButton Bàn giao variant="contained" disabled={detail.isLoading}
298 MutationButton Cập nhật hành trình 
299 MutationButton Xác nhận bàn giao variant="contained" busy={handover.pending} disabled={!shipment || !['planned', 'label_ready'].includes(shipment.state)}
305 MutationButton Ghi sự kiện variant="contained" busy={event.pending} disabled={!canRecordEvent}
312 RouteLink  to={`/s/${shop.id}/orders/${shipment.orderId}`}
317 Typography Sự kiện vận chuyển variant="subtitle2"
319 Typography  
319 Typography Bằng chứng: variant="caption"
320 Typography Chưa có sự kiện. 
321 Alert Hệ thống ghi nhận bàn giao và xuất hàng đang giữ một lần. Trạng thái giao hàng sẽ chỉ đổi khi có sự kiện vận chuyển riêng. 
323 TextField  label="Sự kiện"
326 TextField  label="Mã sự kiện bên vận chuyển" error={codePointLength(externalEventId) > 160 || duplicateEventId} helperText={duplicateEventId ? 'Mã sự kiện này đã được ghi nhận.' : codePointLength(externalEventId) > 160 ? 'Tối đa 160 ký tự.' : undefined}
327 TextField  label="Thời gian sự kiện" type="datetime-local" error={!!occurredAt && !validOccurrence} helperText={!!occurredAt && !validOccurrence ? 'Nhập giờ tồn tại trong múi giờ cửa hàng.' : `Giờ địa phương theo ${shop.timezone}; sẽ chuyển thành instant ISO khi gửi.`}
328 TextField  label="Mã bằng chứng"
329 Alert Giao thành công, thất bại, hoàn về và thu tiền là các trạng thái riêng. Mỗi sự kiện cần mã chống trùng và bằng chứng do người xác minh cung cấp. 

### apps/web/src/modules/fulfillment/index.tsx:349 ShippingQuotePreview

357 Panel  title="Xem trước phí & vùng giao hàng" subtitle="Bản xem trước UI trong demo; không cập nhật đơn và không gửi yêu cầu tới hãng vận chuyển."
359 Alert DỮ LIỆU MÔ PHỎNG · Phí dưới đây chỉ minh họa trạng thái giao diện, không phải báo giá cho địa chỉ hoặc hãng vận chuyển thật. 
361 TextField  label="Vùng giao thử"
364 TextField  label="Kích cỡ kiện thử"
371 Alert Thiếu địa chỉ giao hàng; chưa thể xác định vùng hoặc hiển thị phí. 
373 Alert Vùng mẫu này không được phục vụ; không hiển thị báo giá và không hứa ngày giao. 
375 Alert Báo giá mẫu đã hết hiệu lực; cần lấy báo giá mới trước khi xác nhận. 
376 Alert Ước tính mẫu: VND · · 
377 Typography Trong dữ liệu vận đơn, phí báo giá và phí thực tế được trình bày riêng. Bản xem trước này không lưu cấu hình vùng, không xác nhận khả năng giao và không tạo vận đơn. variant="caption"

## R43 Đổi trả và kiểm hàng hoàn

/s/:shopId/returns

### apps/web/src/modules/orders/index.tsx:252 ReturnsPage

266 useCommand('createReturnCase', ['listReturnCases'])  
267 useCommand('inspectReturn', ['listReturnCases', 'getReturnCase', 'listStockSnapshots', 'getProfitLoss'])  
296 PageHeader  title="Đổi và trả hàng" subtitle="Nhận lại, kiểm tình trạng, xác định nghĩa vụ hoàn. Không tự cộng hàng chưa kiểm vào tồn bán."
296 MutationButton Tạo yêu cầu trả variant="contained" disabled={!canReadOrders}
297 Alert Cần quyền orders.read để chọn đơn gốc và xử lý yêu cầu trả. 
298 Panel  
298 DataTable  
300 RouteLink  to={`/s/${shop.id}/orders/${r.orderId}`}
303 MutationButton Kiểm nhận disabled={!canInspectReturn || ['inspected', 'closed', 'rejected'].includes(r.state)}
305 EditDialog  title="Yêu cầu trả hàng" busy={create.pending}
305 Button Tạo yêu cầu variant="contained" disabled={createInvalid || !canReadOrders || !canCreateReturn || create.pending}
315 Alert Không có quyền đọc danh sách đơn. 
317 TextField  label="Tìm đơn hàng" disabled={!canReadOrders} helperText="Tìm theo mã đơn hoặc khách hàng; truy vấn tìm kiếm do API hỗ trợ."
318 TextField  label="Đơn hàng đã giao" disabled={!canReadOrders || (orders.isPending && !orders.data)} helperText="Chỉ đơn đã giao hoặc đang trả một phần. API kiểm tra tổng số lượng còn được trả."
323 Button Thử lại danh sách đơn 
327 TextField  label={`${line.name} (tối đa ${line.quantity})`} type="number" error={!!field?.invalid} helperText={field?.invalid ? `Nhập số nguyên từ 1 đến ${line.quantity}; API kiểm tra các yêu cầu trả trước đó.` : `Số lượng gốc ${line.quantity}; giới hạn còn lại do API quyết định.`}
329 TextField  label="Lý do trả" error={!reason.trim() || codePointLength(reason) > 1_000} helperText={`${codePointLength(reason)}/1.000 ký tự`}
332 EditDialog  title="Kiểm nhận hàng trả" busy={inspect.pending}
332 MutationButton Xác nhận kiểm nhận variant="contained" disabled={inspectionInvalid || !canInspectReturn} busy={inspect.pending}
347 Alert Người thật xác nhận đã nhận và kiểm hàng. Chỉ “Bán lại được” mới được bổ sung tồn khả dụng. 
348 Typography Đang tải hồ sơ trả hàng mới nhất… 
349 Button Tải lại hồ sơ 
354 Typography  
355 TextField  label="Số lượng nhận" type="number" error={invalidQuantity} helperText={invalidQuantity ? `Nhập số nguyên từ 0 đến ${returnedQuantity}.` : `Tối đa ${returnedQuantity} theo yêu cầu trả.`}
356 TextField  label="Tình trạng"
357 TextField  label="Ghi nhận kiểm tra" error={!line.reason.trim() || codePointLength(line.reason) > 1_000} helperText={`${codePointLength(line.reason)}/1.000 ký tự`}

## R44 Nhà cung cấp hàng hóa

/s/:shopId/suppliers

### apps/web/src/modules/procurement/index.tsx:17 SuppliersPage

23 useCommand('createSupplier', ['listSuppliers'])  
24 useCommand('updateSupplier', ['listSuppliers'])  
25 useCommand('setSupplierStatus', ['listSuppliers'])  
26 useCommand('createSupplierOffer', ['listSupplierOffers'])  
43 PageHeader  title="Nhà cung cấp hàng hóa" subtitle="Tách biệt với nhà cung cấp AI. Mua hàng chỉ trong điều kiện và quyền đã duyệt."
43 MutationButton Thêm nhà cung cấp variant="contained"
43 Panel  
43 DataTable  
45 Typography  
45 Typography  variant="caption"
49 MutationButton Sửa 
49 MutationButton Thêm báo giá 
49 MutationButton Duyệt / tạm dừng 
52 Panel  title="Báo giá sản phẩm" subtitle="Giá vốn, lượng tối thiểu, quy cách và hiệu lực được quản lý riêng."
52 DataTable  
59 EditDialog  title={edit ? 'Cập nhật nhà cung cấp' : 'Nhà cung cấp mới'} busy={create.pending || update.pending}
59 Button Lưu variant="contained" disabled={!supplierFormValid || create.pending || update.pending || (!!edit?.id && (!supplierDetail.data || supplierDetail.isLoading))}
81 TextField  label="Tên nhà cung cấp"
81 TextField  label="Đầu mối liên hệ"
81 TextField  label="Thời gian giao (ngày)" type="number"
81 TextField  label="Điều kiện thanh toán"
81 TextField  label="Cách gửi đơn"
81 TextField  label="Mã adapter đã được duyệt"
81 Alert Tạo hồ sơ không tự cấp quyền mua hoặc thanh toán. 
82 EditDialog  title="Đổi trạng thái nhà cung cấp" busy={status.pending}
82 Button Xác nhận variant="contained" disabled={codePointLength(reason.trim()) < 5 || status.pending || !supplierDetail.data || supplierDetail.isLoading}
87 Typography  
87 TextField  label="Trạng thái"
87 TextField  label="Lý do"
88 EditDialog  title={`Báo giá — ${offerSupplier?.name || ''}`} busy={addOffer.pending}
88 Button Lưu báo giá mới variant="contained" disabled={!offerFormValid || addOffer.pending}
95 TextField  label="Biến thể"
95 Button Thử lại danh sách sản phẩm 
95 TextField  label="Giá nhập đơn vị"
95 TextField  label="Lượng tối thiểu" type="number"
95 TextField  label="Bội số đóng gói" type="number"
95 TextField  label="Thời gian giao (ngày)" type="number"

## R45 Đề nghị nhập và quy tắc

/s/:shopId/replenishment

### apps/web/src/modules/procurement/index.tsx:97 ReplenishmentPage

106 useCommand('evaluateReorder', ['listPurchaseSuggestions'])  
107 useCommand('createPurchaseOrder', ['listPurchaseOrders', 'listPurchaseSuggestions'])  
108 useCommand('createReorderRule', ['listReorderRules'])  
109 useCommand('updateReorderRule', ['listReorderRules'])  
125 PageHeader  title="Nhập lại hàng" subtitle="Trừ hàng đã đặt trước khi đề xuất mua thêm. Tự gửi đơn chỉ khi được bật và đủ hạn mức."
125 MutationButton Thêm quy tắc 
125 MutationButton Đánh giá nhu cầu nhập variant="contained" busy={evaluate.pending}
125 Panel  
125 Alert Đang tải từng phần báo giá/nhà cung cấp. Hãy tải thêm trước khi xác nhận các đề xuất nằm ngoài phần đã tải. 
125 Typography Đang tải danh sách báo giá… 
125 Button Thử lại danh sách báo giá 
125 Typography Chưa có báo giá trong danh sách đã tải. 
125 Typography Đang tải danh sách nhà cung cấp… 
125 Button Thử lại danh sách nhà cung cấp 
125 Typography Chưa có nhà cung cấp trong danh sách đã tải. 
125 DataTable  
135 Typography  
139 MutationButton Lập đơn nháp disabled={!!r.activePurchaseOrderId || r.suggestedQuantity <= 0 || !eligibleOffers.some(offer => offer.id === r.supplierOfferId)} busy={purchase.pending}
144 navigate(`/s/${shop.id}/purchases`)  
148 Panel  
148 DataTable  
151 MutationButton Chỉnh quy tắc 
154 EditDialog  title="Quy tắc nhập lại" busy={create.pending || update.pending}
154 Button Lưu quy tắc variant="contained" disabled={!ruleFormValid || create.pending || update.pending}
164 Typography Đang tải báo giá đã chọn… 
164 Button Thử lại báo giá đã chọn 
164 Typography Đang tải nhà cung cấp đã chọn… 
164 Button Thử lại nhà cung cấp đã chọn 
164 Typography Đang tải danh sách báo giá… 
164 Button Thử lại danh sách báo giá 
164 Typography Đang tải danh sách nhà cung cấp… 
164 Button Thử lại danh sách nhà cung cấp 
164 TextField  label="Báo giá / SKU"
164 TextField  label="Ngưỡng nhập" type="number"
164 TextField  label="Nhập tới" type="number" error={Number.isFinite(Number(target)) && Number(target) < Number(reorder)}
164 TextField  label="Tồn an toàn" type="number"
164 TextField  label="Mức tự động"
164 Alert Không bao gồm quyền chuyển tiền. Backend phải kiểm nhà cung cấp, giá, lượng, ngân sách và chính sách trước mỗi lần gửi. 
164 Alert Vai trò hiện tại không có quyền xem chính sách ngân sách; không thể lưu chế độ tự gửi. 
164 Typography Đang tải chính sách ngân sách mua hàng… 
164 Button Thử lại chính sách ngân sách 
164 Typography Không có chính sách ngân sách mua hàng đang bật và có hạn mức. 
164 TextField  label="Ngân sách mua hàng đã duyệt"

## R46 Đơn mua hàng

/s/:shopId/purchases

### apps/web/src/modules/procurement/index.tsx:180 PurchasesPage

186 useCommand('createPurchaseOrder', ['listPurchaseOrders'])  
222 PageHeader  title="Đơn mua hàng" subtitle="Duyệt đúng nội dung trước khi gửi. Kết quả gửi chưa rõ phải đối chiếu, không gửi lại mù quáng."
222 MutationButton Tạo đơn mua variant="contained"
222 Panel  
222 DataTable  
223 Typography  
223 Button Xem chi tiết 
225 EditDialog  title="Đơn mua mới" busy={create.pending}
225 Button Lưu đơn nháp variant="contained" disabled={!canCreate}
227 TextField  label="Nhà cung cấp đã duyệt"
229 Button Thử lại danh sách nhà cung cấp 
230 Alert  
236 Typography Dòng hàng 
237 Button Xóa dòng 
240 TextField  label={`Báo giá dòng ${index + 1}`}
243 TextField  label={`Số lượng dòng ${index + 1}`} type="number" error={!!lineOffer && !!line.quantity && !quantityMatchesOffer(line.quantity, lineOffer)} helperText={lineOffer ? `Số nguyên, tối thiểu ${lineOffer.minimumQuantity} và bội số ${lineOffer.packSize}.` : 'Chọn báo giá cùng nhà cung cấp.'}
248 Button Thử lại danh sách báo giá 
249 Alert Bộ chọn chỉ lọc trong báo giá đã tải. Tải thêm để tìm offer của nhà cung cấp đã chọn. 
250 Button Thêm dòng hàng disabled={!supplierId || !availableOffers.some(offer => !poLines.some(line => line.supplierOfferId === offer.id))}
251 Alert Giá theo từng báo giá đã chọn; tổng cam kết chính thức do API trả về và được gắn vào nội dung xin duyệt. 

### apps/web/src/modules/procurement/index.tsx:255 PurchaseDialog

262 useCommand('requestPurchaseApproval', ['getPurchaseOrder', 'listPurchaseOrders', 'listApprovals'])  
263 useCommand('sendPurchaseOrder', ['getPurchaseOrder', 'listPurchaseOrders', 'listApprovals'])  
264 useCommand('confirmPurchaseOrder', ['getPurchaseOrder', 'listPurchaseOrders'])  
265 useCommand('cancelPurchaseOrder', ['getPurchaseOrder', 'listPurchaseOrders', 'listPurchaseSuggestions'])  
277 EditDialog  title={`Đơn mua ${resourceId}`}
277 Button Đóng 
277 DataTable  
279 Typography Hash nội dung: variant="caption"
279 MutationButton Xin phê duyệt busy={approval.pending}
279 MutationButton Gửi đơn mua variant="contained" disabled={unresolvedSend}
279 MutationButton Nhà cung cấp đã xác nhận 
279 MutationButton Hủy đơn 
279 RouteLink Xem phê duyệt to={`/s/${shop.id}/approvals`}
279 RouteLink Nhận hàng theo đơn này to={`/s/${shop.id}/receipts?purchaseOrderId=${p.id}`}
279 Alert Chưa xác minh kết quả gửi. Không gửi lại; hãy kiểm tra trạng thái lệnh trước khi tiếp tục. 
280 ConfirmDialog  title="Gửi đơn mua đã duyệt" error={send.error} busy={send.pending}
280 ConfirmDialog  title="Hủy đơn mua" error={cancel.error} busy={cancel.pending}
281 EditDialog  title="Ghi nhận xác nhận của nhà cung cấp" busy={confirm.pending}
281 Button Ghi xác nhận variant="contained" disabled={!external || !proof || confirm.pending}
286 TextField  label="Tham chiếu đơn phía nhà cung cấp"
286 TextField  label="Mã bằng chứng xác nhận"

## R47 Nhận hàng và đối chiếu

/s/:shopId/receipts

### apps/web/src/modules/procurement/index.tsx:288 ReceiptsPage

297 useCommand('createGoodsReceipt', ['listGoodsReceipts'])  
298 useCommand('postGoodsReceipt', ['getGoodsReceipt', 'getPurchaseOrder', 'listGoodsReceipts', 'listPurchaseOrders', 'listStockSnapshots', 'listDebtItems', 'listJournals'])  
329 PageHeader  title="Nhận hàng" subtitle="Nhận từng phần, ghi hàng đạt/hỏng; chỉ hàng đạt làm tăng tồn và công nợ mô phỏng."
329 MutationButton Tạo phiếu nhận variant="contained"
329 Panel  
329 DataTable  
332 MutationButton Xem / ghi nhận phiếu disabled={r.status !== 'draft'}
335 EditDialog  title="Phiếu nhận hàng mới" busy={create.pending}
335 Button Tạo phiếu nháp variant="contained" disabled={!createValid}
337 TextField  label="Đơn mua đã xác nhận" disabled={orders.isPending && !orders.data}
342 Button Thử lại danh sách đơn mua 
343 TextField  label="Mã phiếu giao / chứng từ nguồn"
350 Typography  
351 Typography Đặt · đã nhận · bị từ chối · còn variant="caption"
353 TextField  label={`Nhận đạt ${line.variantId}`} type="number" error={invalid}
354 TextField  label={`Từ chối / hỏng ${line.variantId}`} type="number" error={invalid}
356 TextField  label={`Ghi chú kiểm hàng ${line.variantId}`} error={invalid && Number(input.rejected || 0) > 0} helperText={Number(input.rejected || 0) > 0 && !input.reason.trim() ? 'Cần ghi rõ lý do hàng bị từ chối.' : undefined}
362 EditDialog  title={`Phiếu nhận ${selectedId || ''}`} busy={post.pending}
363 Button Đóng 
364 MutationButton Kiểm & ghi nhận vào kho variant="contained" busy={post.pending} disabled={receiptDetail.isLoading}
370 DataTable  
376 Alert Phiếu đã được ghi nhận. Ghi sổ kho/công nợ không thể gửi lại từ trạng thái này. 
379 ConfirmDialog  title="Ghi nhận hàng đã kiểm vào kho" busy={post.pending} error={post.error}

## R48 Chứng từ và sổ kép

/s/:shopId/finance/journals

### apps/web/src/modules/finance/index.tsx:208 JournalsPage

215 useCommand('createJournal', ['listJournals'])  
216 useCommand('postJournal', ['listJournals'])  
217 useCommand('reverseJournal', ['listJournals'])  
227 PageHeader  title="Bút toán" subtitle="Sổ kép có chứng từ nguồn, kiểm cân bằng tại API và không sửa bút toán đã ghi."
227 MutationButton Tạo bút toán nháp variant="contained"
227 Panel  
227 DataTable  
228 Button  
232 Button Chi tiết 
234 EditDialog  title={viewedJournal ? `Bút toán ${viewedJournal.id}` : 'Đang tải bút toán'}
234 Button Đóng 
234 DataTable  
239 MutationButton Ghi sổ 
239 MutationButton Đảo bút toán 
240 EditDialog  title="Bút toán nháp" busy={create.pending}
240 Button Lưu nháp variant="contained" disabled={!sourceId.trim() || codePointLength(reason.trim()) < 5 || create.pending || !balanced || !periodOpen}
240 Alert  
240 TextField  label="Loại chứng từ nguồn"
240 TextField  label="Mã chứng từ nguồn"
240 TextField  type="date" label="Ngày hiệu lực"
240 Alert Đang tải trạng thái kỳ kế toán… 
240 Alert  
240 TextField  label={side === 'debit' ? 'Nợ' : 'Có'} error={decimalUnits(line[side].amount) === null || (side === 'debit' ? decimalUnits(line.credit.amount) : decimalUnits(line.debit.amount)) === null} helperText={decimalUnits(line[side].amount) === null ? 'Dùng số thập phân tối đa 4 chữ số.' : ''}
240 TextField  label="Diễn giải dòng" error={!line.description.trim()} helperText={!line.description.trim() ? 'Bắt buộc nhập diễn giải.' : ''}
240 Alert  
240 Button Bỏ dòng disabled={lines.length <= 2}
240 Button Thêm dòng 
240 Alert Tổng Nợ · Tổng Có 
240 TextField  label="Lý do"
241 ConfirmDialog  title={selected?.action === 'post' ? 'Ghi sổ bút toán' : 'Đảo bút toán'} error={post.error || reverse.error} busy={post.pending || reverse.pending}

### apps/web/src/modules/finance/index.tsx:200 JournalAccountField

201 TextField  label={`Tài khoản dòng ${index}`} error={!value.trim()} helperText={value ? 'Tài khoản tổng hợp chỉ dùng nghiệm thu UI; không xác thực với sơ đồ kế toán thật.' : 'Chọn tài khoản mẫu để hoàn tất luồng demo.'}
205 TextField  label={`Tài khoản dòng ${index}`} error={!value.trim()} helperText={!value.trim() ? 'Nhập ID do hệ thống cấp; UI không tự tạo danh mục tài khoản.' : ''}

## R49 Đối soát ngân hàng và COD

/s/:shopId/finance/reconciliation

### apps/web/src/modules/finance/index.tsx:244 ReconciliationPage

252 useCommand('matchCODSettlement', ['listCODSettlements', 'listBankTransactions', 'listDebtItems', 'getCashflow'])  
253 useCommand('matchSettlement', ['listReconciliationCases', 'listBankTransactions', 'listDebtItems'])  
269 PageHeader  title="Đối soát ngân hàng & COD" subtitle="Khách trả tiền cho đơn vị giao hàng chưa đồng nghĩa tiền đã về shop."
269 MutationButton Nhập bảng đối soát variant="contained"
269 Panel  
269 DataTable  
276 DataTable  
283 MutationButton Đối chiếu disabled={row.status === 'matched'}
284 DataTable  
289 MutationButton Ghép giao dịch disabled={row.state === 'matched'}
291 EditDialog  title="Ghép tiền COD" busy={match.pending}
291 Button Xác nhận khớp variant="contained" disabled={!codMatchValid || match.pending}
291 TextField  label="Mã giao dịch ngân hàng"
291 TextField  label={`Phí thực tế (${shop.currency})`} error={feeUnits === null} helperText={selectedBank && feeUnits !== null && !codMatchValid ? 'Tiền về + phí phải bằng khoản COD và cần chứng từ phí.' : 'Nhập phí theo chứng từ; khoản fee đã khấu trừ không phải chi tiền thêm.'}
291 TextField  label="Mã chứng từ phí"
291 Alert Không xác nhận thanh toán bằng ảnh chuyển khoản. Tổng tiền về và phí phải khớp khoản COD. 
292 EditDialog  title="Ghép giao dịch với công nợ" busy={matchBank.pending}
292 Button Ghi kết quả đối soát variant="contained" disabled={!bankMatchValid || matchBank.pending}
292 TextField  label="Giao dịch ngoài hệ thống"
292 TextField  label="Khoản công nợ"
292 TextField  label={`Số tiền phân bổ (${shop.currency})`} error={allocation !== '' && allocationUnits === null} helperText={allocationUnits !== null && allocationUnits > 0n && !bankMatchValid ? 'Số tiền vượt chênh lệch/khoản nợ, khác tiền tệ hoặc thiếu lý do.' : ''}
292 TextField  label="Lý do"

### apps/web/src/modules/finance/index.tsx:295 StatementDialog

299 useCommand('uploadFile', [])  
299 useCommand('importBankStatement', ['listBankTransactions', 'listReconciliationCases'])  
299 useCommand('importCODStatement', ['listCODSettlements'])  
302 EditDialog  title="Nhập bảng đối soát" busy={upload.pending || bank.pending || cod.pending}
302 RouteLink Xem kết quả nhập to={`/s/${shop.id}/jobs/${jobId}`}
302 Button Kiểm tra và nhập variant="contained" disabled={!__MOCK__ || !file || !account || !batch || upload.pending || bank.pending || cod.pending}
313 Alert Hợp đồng upload hiện chưa có mục đích cho tệp đối soát. Luồng này chỉ chạy trong MSW demo. 
313 TextField  label="Loại bảng"
313 Button  variant="outlined"
313 TextField  label="Mã tài khoản / đơn vị vận chuyển"
313 TextField  label="Mã đợt nhập duy nhất"
313 TextField  label="Mã định dạng được backend hỗ trợ"
313 Alert Mẫu CSV và định dạng mô phỏng nằm trong samples/. Định dạng ngân hàng thật phải được backend xác nhận; nhập không đồng nghĩa đối soát xong. 

## R50 Công nợ và khóa kỳ

/s/:shopId/finance/debts-periods

### apps/web/src/modules/finance/index.tsx:315 DebtsPage

318 useCommand('closeAccountingPeriod', ['listAccountingPeriods'])  
319 useCommand('reopenAccountingPeriod', ['listAccountingPeriods'])  
321 PageHeader  title="Công nợ & khóa kỳ" subtitle="Theo dõi khoản còn phải thu/trả; khóa kỳ chỉ khi các điều kiện được kiểm chứng."
321 Panel  title="Công nợ"
321 DataTable  
323 Panel  title="Kỳ kế toán"
323 DataTable  
326 MutationButton  
328 ConfirmDialog  title="Khóa kỳ kế toán" busy={close.pending} error={close.error}
328 EditDialog  title="Mở lại kỳ đã khóa" busy={reopen.pending}
328 Button Mở lại kỳ disabled={!approval || codePointLength(reason) < 5 || reopen.pending}
332 TextField  label="Mã phê duyệt đúng kỳ"
332 TextField  label="Lý do"

## R51 Bốn vai trò AI và quyền

/s/:shopId/bot/team

### apps/web/src/modules/bot/index.tsx:70 AgentTeamPage

74 useCommand('updateAgentRole', ['listAgentRoles', 'getOperationsSummary'])  
75 useCommand('controlAutomation', ['listAgentRoles', 'getBotConfig', 'getOperationsSummary'])  
76 useCommand('updateBudgetPolicy', ['listBudgetPolicies'])  
81 PageHeader  title="Đội ngũ AI" subtitle="Bốn vai trò trên cùng nền điều phối, quyền và người chịu trách nhiệm rõ ràng."
81 Panel  title={roleNames[r.kind]}
81 MutationButton Phân công 
81 MutationButton  
81 Panel  title="Ngân sách được giao"
81 DataTable  
84 MutationButton Đổi có phê duyệt 
87 Panel  title="Chi phí AI & dự phòng nhà cung cấp"
89 Alert Chi phí trong phòng thử là ước tính mô phỏng. Chỉ dùng provider dự phòng đã được phê duyệt; demo không chuyển dữ liệu khách sang provider khác. 
95 EditDialog  title="Giao trách nhiệm và cấu hình vai trò" busy={update.pending}
95 Button Lưu phân công variant="contained" disabled={!owner || !connection || !policy || update.pending}
99 TextField  label="Mã nhân sự chịu trách nhiệm"
99 TextField  label="Mã kết nối AI"
99 TextField  label="Phiên bản chính sách đã duyệt"
99 Alert Công cụ được phép do backend trả về; không sửa quyền qua prompt. 
100 ConfirmDialog  title={stop?.action === 'pause' ? 'Tạm dừng vai trò' : 'Kiểm điều kiện để tiếp tục'} error={control.error} busy={control.pending}
101 EditDialog  title="Đổi giới hạn được duyệt" busy={budgetUpdate.pending}
101 Button Áp dụng giới hạn variant="contained" disabled={!amount || !approval || budgetUpdate.pending}
107 TextField  label={`Giới hạn (${shop.currency})`}
107 TextField  label="Mã phê duyệt đúng nội dung"

## R52 Bản tin và sức khỏe hệ thống

/s/:shopId/operations/digests

### apps/web/src/modules/operations/index.tsx:238 DigestsPage

242 useCommand('controlAutomation', ['listAgentRoles', 'getBotConfig', 'getOperationsSummary'])  
246 PageHeader  title="Bản tin & sức khỏe hệ thống" subtitle="Những việc quan trọng cần chủ shop quyết định; không thay thế người trực thực tế."
247 Alert Đây là dữ liệu mô phỏng. Trạng thái “chưa xác minh” không chứng minh backend, provider hoặc worker đã sẵn sàng. 
249 Panel  title="Bản tin điều hành"
253 Typography → variant="subtitle2"
253 Typography · phiên bản variant="caption"
254 Typography  
262 Panel  title="Trạng thái phụ thuộc"
266 Typography  
267 Typography  variant="body2"
268 Typography  variant="caption"
272 Alert Chỉ hiển thị lịch sử bản tin theo hợp đồng hiện hành. Chưa có API tạo/sửa lịch bản tin; không dựng nút lưu lịch giả. 
275 Panel  title="Phục hồi & sẵn sàng triển khai" subtitle="Bảng kiểm hiển thị rõ những điều chưa được xác minh trong bản frontend demo."
277 Alert Chưa có nguồn readiness/restore trong API hiện hành. Các mục bên dưới giữ trạng thái chưa xác minh và không thể cấp tín hiệu cho phép phát hành. 
284 Typography  
285 Typography  
287 Typography Có bản sao lưu không chứng minh đã khôi phục thành công. Không có nút “sẵn sàng” trong chế độ mô phỏng. variant="caption"
290 Panel  title="Quyền dừng vai trò AI" subtitle="Lệnh được mô phỏng theo version của từng vai trò; tiếp tục không đồng nghĩa hệ thống đã sẵn sàng."
294 Typography  
294 Typography Thế hệ · variant="caption"
295 MutationButton  
301 ConfirmDialog  title={stop?.action === 'pause' ? 'Tạm dừng vai trò AI' : 'Kiểm tra điều kiện tiếp tục'} error={control.error} busy={control.pending}

## R53 Thông tin hỗ trợ marketing

/s/:shopId/reports/marketing

### apps/web/src/modules/reports/index.tsx:217 MarketingPage

222 PageHeader  title="Thông tin cho marketing" subtitle="Đề xuất chỉ đọc; trang không tự đăng nội dung hoặc thay đổi ngân sách."
224 Alert Số liệu minh họa từ fixture API tổng hợp; không phải dữ liệu quảng cáo hoặc phân bổ nguồn thật. 
226 Stat  title="Đơn có nguồn xác định"
227 Stat  title="Đơn chưa rõ nguồn"
228 Stat  title="Chi quảng cáo thực tế"
229 Stat  title="Chi quảng cáo ước tính"
232 Alert getMarketingSummary không nhận bộ lọc ngày; không thể lọc chuỗi này theo kỳ ở frontend. 
233 Typography Cập nhật · · múi giờ variant="caption"
236 Panel  title="Câu hỏi khách thường hỏi" subtitle="Các mục do API tổng hợp cung cấp."
239 Typography  
239 Typography Chưa đủ dữ liệu. 
243 Panel  title="Lý do không chốt đơn" subtitle="Biểu đồ và bảng dùng cùng một payload API."
251 Typography API chưa cung cấp nhóm lý do để vẽ biểu đồ. 
253 DataTable  label="Lý do không chốt đơn" empty="Chưa có lý do mất đơn trong payload API."
259 Alert Không tự gán nguồn cho đơn thiếu dữ liệu, không ghi chi ước tính thành chi thực tế và không tự đăng nội dung hoặc tăng ngân sách. 

### apps/web/src/modules/reports/index.tsx:23 MarketingReasonTick



## R54 Yêu cầu sau bán

/s/:shopId/service-cases

### apps/web/src/modules/customers/index.tsx:182 ServiceCasesPage

187 useCommand('createServiceCase', ['listServiceCases'])  
188 useCommand('setServiceCaseStatus', ['listServiceCases'])  
195 PageHeader  title="Chăm sóc sau bán" subtitle="Nhận câu hỏi, khiếu nại và yêu cầu đổi trả; không tự hứa hoàn tiền."
195 MutationButton Tạo yêu cầu variant="contained"
196 Panel  
200 DataTable  
201 Typography  
201 Typography  variant="caption"
202 RouteLink  to={`/s/${shop.id}/customers/${item.customerId}`}
203 RouteLink  to={`/s/${shop.id}/orders/${item.orderId}`}
206 MutationButton Xử lý 
212 EditDialog  title="Yêu cầu mới" busy={create.pending}
212 Button Tạo yêu cầu variant="contained" disabled={!customerId || codePointLength(summary.trim()) < 5 || !selectedOrderIsValid || create.pending}
224 TextField  label="Khách hàng"
228 TextField  label="Đơn hàng liên quan (không bắt buộc)" disabled={!customerId || !canReadOrders || relatedOrders.isPending} helperText={!canReadOrders ? 'Vai trò này không có quyền xem đơn; có thể tạo yêu cầu không gắn đơn.' : !customerId ? 'Chọn khách hàng trước để lọc đúng đơn của họ.' : relatedOrders.isPending ? 'Đang tải đơn của khách đã chọn…' : relatedOrders.data?.data.length ? 'Chỉ hiển thị đơn thuộc khách hàng đã chọn.' : 'Không có đơn phù hợp; có thể tạo yêu cầu không gắn đơn.'}
233 TextField  label="Loại yêu cầu"
234 TextField  label="Nội dung" minRows={3} helperText={`${codePointLength(summary)}/1000`}
235 Alert Yêu cầu chỉ được liên kết với đơn đã tải từ hồ sơ khách đang chọn. Việc tạo case không xác nhận đổi trả hoặc hoàn tiền. 
238 EditDialog  title="Cập nhật yêu cầu" busy={change.pending}
238 Button Cập nhật variant="contained" disabled={!reason.trim() || change.pending}
248 Typography  
249 RouteLink Mở đơn to={`/s/${shop.id}/orders/${selected.orderId}`}
250 TextField  label="Trạng thái mới"
251 TextField  label="Kết quả / lý do" minRows={3}
252 Alert Cập nhật case không tạo giao dịch hoàn tiền. Nếu cần đổi/trả, xử lý qua quy trình đơn hàng được cấp quyền. 
