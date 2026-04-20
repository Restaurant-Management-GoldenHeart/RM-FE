git fetch origin: Chỉ tải thông tin về các thay đổi mới nhất nhưng chưa gộp vào code của bạn (an toàn hơn pull).

\*ban đầu :

mỗi lần code FE, thì lên git xem phần BE đã có version mới chưa 

\- nếu có thì pull  về rồi làm tiếp 



&#x09;	git checkout main

&#x09;	git pull origin main :lay code mới nhát từ main về



&#x20;\*khi bắt đầu làm (\*làm 1 lần )

\- lên skill.sh : tải 2 cái skills , link tui để trong zalo -> chọn agument , rồi enter để tải , enter đi khi complete thì th

\*bân đầu khi hỏi chat :

+kêu chat đọc toàn bộ dự án + các file-skills.md + đọc cách sử dụng các API ở RM-BE , đọc luồng xỷ lý logic +file API\_POSTMAN\_TESTING\_GUIDE.md trong BE

+dựa vào database đã có ở BE rồi triển khai 



+lưu ý GIT ở FE 

\-khi lấy code Fe từ nhánh main về để làm  thì thông thường sẽ không chay được -> bật terminal trỏ tới tên project ->go npm i

\-khi làm chức năng , giao diện nào thì tạo nhánh với tên "chức-năng-tên của mình" (test accept hết rồi thì mới đẩy pull **request** lên nhánh main )

&#x09;	git branch <tên-nhánh-mới> : tạo 1 nhánh

&#x09;	git checkout "chức-năng-tên của mình" :chuyển từ 1 nhánh nào đó (main) sang nhánh "chức-năng-tên của mình"

&#x09;	git add .

&#x09;	git commit -m "Nội dung code up lên" 

&#x09;	git push -u origin <tên-nhánh-mới> :đẩy toàn bộ code lên nhánh "chức-năng-tên của mình"

&#x09;	

+lưu ý file BE và FE

có cấu trúc thư mục như sau :

RM --RM\_FE

&#x20;  --RM\_BE



khi open project thì trỏ thẳng vào RM\_FE hoạc RM\_BE không nên trỏ vào RM 

\--nhắc chat không sửa phần BE khi đang hỏi FE  

+khi hỏi chat thì phải bắt chat comment lại đoạn code xử lý về mặt logic +không đụng đến toàn bộ code liên quan đến project RM\_BE

\--chạy ở FE : npm run dev 

\--chạy ở BE thì  vào file GoldenHeartRestaurantApplication bấm chuột phải  run Java/ hoặc bám hình tam giác ở góc phải trên cùng







\-khi làm test trên jira :
+Ưu tiên những chức năng liên quan đến nhau 
+Khi làm các task thì hỏi chat về mặt logic nghiệp vụ thực tế như thế nào + nghiệp vụ trên BE 



tài liệu FE :React (video tiếng việt f8) , npm 

&#x09;	

