# Baseline địa chỉ khách trước sửa source

Source tests/ui-master-resources.spec.ts vẫn khớp nguyên byte HEAD54 bcdf5414015fe045482278f3f115b53e9e7c4262; VS01 đang được xác minh riêng trong working tree. Run38050319695 Firefox/job114207967139 ca297: initial table Địa chỉ trong hồ sơ khách chưa tìm thấy trong5000ms, assertion tại41:145 trước click sửa địa chỉ/PATCH. Raw hosted trace chờ artifact khi job hoàn tất, chưa gán root cause sâu.

CustomerDetail lazy route lấy getCustomer trước khi mount AddressesPanel; panel lấy listCustomerAddresses c1 qua usePagedApi GET /customers/c1/addresses. Source app/addresses/orders/hook/mock/contracts chỉ đọc. Giữ kiểm phone disabled/trống, PATCH chỉlabel, link đơn hàng, chọnđúngkhách và optionđịa chỉupdated; không sửa app/mock/API/timeout/retry/ngưỡng. Chưa thay tracked source này.
