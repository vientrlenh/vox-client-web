# Question Permission Matrix

Tai lieu nay tong hop endpoint va ma tran quyen cho 3 nhom:

- `QuestionBank`
- `QuestionTopic`
- `Question`

Phan nay duoc viet theo codebase hien tai va cac rule da chot trong team.

## Role Definitions

- `SYSTEM_ADMIN`: quan tri he thong
- `SCHOOL_ADMIN`: quan tri nha truong
- `TEACHER_OWNER`: giao vien la nguoi tao/noi dung so huu doi tuong
- `TEACHER_REVIEWER`: giao vien dang o vai tro reviewer hop le
- `TEACHER_UNRELATED`: giao vien khong lien quan truc tiep
- `STUDENT`: hoc sinh

## Endpoint Inventory

### QuestionBank

REST:

- `POST /api/v1/question-banks/system`
- `POST /api/v1/question-banks/school`
- `PATCH /api/v1/question-banks/{bankId}`
- `DELETE /api/v1/question-banks/{bankId}`
- `PATCH /api/v1/question-banks/{bankId}/review-actions`

GraphQL:

- `teacherQuestionBanks(page, size)`
- `teacherQuestionBank(id)`
- `schoolQuestionBanks(page, size)`
- `schoolQuestionBank(id)`
- `adminQuestionBanks(page, size)`
- `adminSchoolQuestionBanks(schoolId, page, size)`
- `adminQuestionBank(id)`

### QuestionTopic

REST:

- `POST /api/v1/question-topics`
- `PUT /api/v1/question-topics/{id}`
- `DELETE /api/v1/question-topics/{topicId}`
- `PATCH /api/v1/question-topics/{topicId}/review-actions`

GraphQL:

- `teacherBankTopics(bankId, page, size)`
- `teacherQuestionTopic(id)`
- `teacherTopicQuestions(bankId, topicId, page, size, scope, status, type, keyword)`
- `schoolBankTopics(bankId, page, size)`
- `schoolQuestionTopic(id)`
- `schoolTopicQuestions(bankId, topicId, page, size, scope, status, type, keyword)`
- `adminBankTopics(bankId, page, size, includeArchived)`
- `adminQuestionTopic(id)`
- `adminTopicQuestions(bankId, topicId, page, size, includeArchived, scope, status, type, keyword)`

### Question

REST:

- `POST /api/v1/questions/system`
- `POST /api/v1/questions/school`
- `PUT /api/v1/questions/{questionId}/content`
- `POST /api/v1/questions/{questionId}/assets`
- `PUT /api/v1/questions/{questionId}/assets`
- `DELETE /api/v1/questions/{questionId}/assets`
- `POST /api/v1/questions/{questionId}/evaluation-guide`
- `PUT /api/v1/questions/{questionId}/evaluation-guide`
- `DELETE /api/v1/questions/{questionId}/evaluation-guide`
- `DELETE /api/v1/questions/{questionId}`
- `PATCH /api/v1/questions/{questionId}/review-actions`

GraphQL:

- `question(id)`
- `teacherMyQuestions(page, size)`
- `teacherQuestions(page, size, scope, status, type, keyword)`
- `teacherReviewQueue(page, size)`
- `schoolQuestions(page, size, scope, status, type, keyword)`
- `schoolReviewQueue(page, size)`
- `adminQuestions(page, size, includeArchived, status, keyword)`
- `adminReviewQueue(page, size)`

## QuestionBank Matrix

| Role | View List | View Detail | Create | Update Content | Update Status |
|---|---|---|---|---|---|
| `SYSTEM_ADMIN` | `OK`: xem tat ca bank qua `adminQuestionBanks(page, size)`; xem bank school theo `schoolId` qua `adminSchoolQuestionBanks(schoolId, page, size)` | `OK`: xem moi bank qua `adminQuestionBank(id)` | `OK`: tao `SYSTEM` bank | `OK`: sua bank he thong | `OK`: doi trang thai bank he thong |
| `SCHOOL_ADMIN` | `OK`: xem tat ca bank cua school minh qua `schoolQuestionBanks(page, size)` | `OK`: xem bank cua school minh; xem duoc bank `SYSTEM` neu `PUBLISHED` qua `schoolQuestionBank(id)` | `OK`: tao `SCHOOL` bank cua school minh | `OK`: sua bank cua school minh | `OK`: doi trang thai bank cua school minh |
| `TEACHER_OWNER` | `OK`: xem bank `SYSTEM` neu `PUBLISHED`; xem bank `SCHOOL` cua school minh neu `PUBLISHED` qua `teacherQuestionBanks(page, size)` | `OK`: nhu list; khong xem bank school minh neu chua `PUBLISHED`, qua `teacherQuestionBank(id)` | `NO`: khong tao bank | `NO` | `NO` |
| `TEACHER_REVIEWER` | `OK`: giong teacher thuong, xem qua `teacherQuestionBanks(page, size)` | `OK`: giong teacher thuong, xem qua `teacherQuestionBank(id)` | `NO` | `NO` | `NO` |
| `TEACHER_UNRELATED` | `OK`: chi thay bank `SYSTEM` publish va bank school minh publish qua `teacherQuestionBanks(page, size)` | `OK`: nhu list, qua `teacherQuestionBank(id)` | `NO` | `NO` | `NO` |
| `STUDENT` | `NO`: khong co endpoint/query cho student | `NO` | `NO` | `NO` | `NO` |

## QuestionTopic Matrix

| Role | View List | View Detail | Create | Update Content | Update Status |
|---|---|---|---|---|---|
| `SYSTEM_ADMIN` | `OK`: xem topic theo `bankId` qua `adminBankTopics(bankId, ...)`, co `includeArchived` | `OK`: xem moi topic qua `adminQuestionTopic(id)` | `OK`: tao topic cho bank hop le | `OK`: sua topic | `OK`: doi trang thai topic |
| `SCHOOL_ADMIN` | `OK`: xem topic cua bank school minh ke ca bank chua publish neu topic chua `ARCHIVED`; xem topic cua bank `SYSTEM` neu bank/topic `PUBLISHED`, qua `schoolBankTopics(bankId, ...)` | `OK`: cung rule nhu list, qua `schoolQuestionTopic(id)` | `OK`: tao topic cho bank school minh | `OK`: sua topic school minh | `OK`: doi trang thai topic school minh |
| `TEACHER_OWNER` | `OK`: xem topic cua bank `SYSTEM` neu bank/topic `PUBLISHED`; xem topic cua bank school minh neu bank/topic `PUBLISHED`, qua `teacherBankTopics(bankId, ...)` | `OK`: cung rule nhu list, qua `teacherQuestionTopic(id)` | `NO`: teacher khong tao topic | `NO` | `NO` |
| `TEACHER_REVIEWER` | `OK`: giong teacher thuong, khong co quyen reviewer rieng o muc topic, xem qua `teacherBankTopics(bankId, ...)` | `OK`: giong teacher thuong, qua `teacherQuestionTopic(id)` | `NO` | `NO` | `NO` |
| `TEACHER_UNRELATED` | `OK`: chi topic publish hop le, qua `teacherBankTopics(bankId, ...)` | `OK`: chi topic publish hop le, qua `teacherQuestionTopic(id)` | `NO` | `NO` | `NO` |
| `STUDENT` | `NO` | `NO` | `NO` | `NO` | `NO` |

## Question Matrix

### Scope = `QUESTION_BANK`

| Role | View List | View Detail | Create | Update Content | Update Status |
|---|---|---|---|---|---|
| `SYSTEM_ADMIN` | `OK`: xem toan cuc qua `adminQuestions(...)`; xem queue qua `adminReviewQueue(...)`; xem theo topic qua `adminTopicQuestions(bankId, topicId, ...)` | `OK`: xem detail neu question khong `ARCHIVED` qua `question(id)` | `OK`: tao system question qua `POST /api/v1/questions/system` | `OK`: sua content/assets/evaluation-guide theo logic use case | `OK`: review/publish/archive qua `review-actions` |
| `SCHOOL_ADMIN` | `OK`: xem danh sach truc tiep qua `schoolQuestions(page, size, scope, status, type, keyword)`; xem review queue school minh qua `schoolReviewQueue(...)`; xem question theo topic cua school minh qua `schoolTopicQuestions(...)`; xem question cua `SYSTEM` qua `schoolQuestions(...)` hoac `schoolTopicQuestions(...)` neu cau do `PUBLISHED + BANK_VISIBLE` | `OK`: xem question school minh neu bank/topic/question khong `ARCHIVED`; xem question `SYSTEM` neu `bank PUBLISHED + topic PUBLISHED + question PUBLISHED + visibility = BANK_VISIBLE`, qua `question(id)` | `OK`: tao school question qua `POST /api/v1/questions/school` | `OK`: sua school question cua school minh neu status/scope cho phep | `OK`: review school question |
| `TEACHER_OWNER` | `OK`: xem cau cua minh qua `teacherMyQuestions(...)`; xem danh sach hien thi truc tiep qua `teacherQuestions(page, size, scope, status, type, keyword)`; trong `teacherTopicQuestions(...)` thay cau cua minh ke ca chua publish neu query vao duoc bank/topic hop le | `OK`: xem cau cua minh neu question/bank/topic khong `ARCHIVED`, qua `question(id)` | `OK`: tao school question trong school minh | `OK`: sua cau minh khi status cho phep, dien hinh `DRAFT`, `REVISION_REQUESTED`, `REJECTED` | `OK`: submit for review va cac review-action owner duoc phep; khong dong nghia tu approve cau minh |
| `TEACHER_REVIEWER` | `OK`: xem queue review qua `teacherReviewQueue(...)` neu `SUBMITTED_FOR_REVIEW + REVIEWER_ONLY + khong phai minh tao + cung school`; ngoai ra co the thay trong `teacherQuestions(...)` va `teacherTopicQuestions(...)` neu query hop le | `OK`: xem detail neu cau dang o review queue hop le, qua `question(id)` | `NO`: reviewer khong co quyen tao theo vai reviewer | `NO`: reviewer khong sua content cau nguoi khac | `OK`: approve/reject/revision requested khi queue review hop le |
| `TEACHER_UNRELATED` | `OK`: trong `teacherQuestions(...)` hoac `teacherTopicQuestions(...)`, chi thay cau cua nguoi khac neu `status = PUBLISHED` va `visibility = BANK_VISIBLE`, thuoc `SYSTEM` hoac school minh | `OK`: xem detail neu `question PUBLISHED + BANK_VISIBLE`, bank/topic `PUBLISHED`, va bank la `SYSTEM` hoac school minh, qua `question(id)` | `NO` | `NO` | `NO` |
| `STUDENT` | `NO`: khong co query cho student | `NO` | `NO` | `NO` | `NO` |

### Delete on `QUESTION_BANK`

`DELETE /api/v1/questions/{questionId}` dung cung nhom role voi update content:

- `SYSTEM_ADMIN`: `OK`
- `SCHOOL_ADMIN`: `OK` voi question school cua school minh khi permission update cho phep
- `TEACHER_OWNER`: `OK` voi question cua minh khi permission update cho phep
- `TEACHER_REVIEWER`: `NO`
- `TEACHER_UNRELATED`: `NO`
- `STUDENT`: `NO`

Rule xoa hien tai:

- neu question dang `DRAFT` va chua duoc su dung thi `HARD_DELETE`
- neu question da duoc su dung hoac khong con o `DRAFT` thi chuyen thanh `ARCHIVED`

Cach xac dinh `chua duoc su dung` trong code hien tai:

- chua co question khac tham chieu no qua `sourceQuestionId`

Luu y:

- `delete` hien tai dang bam cung permission voi `update content`
- nghia la role nao sua duoc theo flow hien tai thi moi co the goi `DELETE`

### Delete Asset on `QUESTION`

`DELETE /api/v1/questions/{questionId}/assets` dung cung nhom role voi update content:

- `SYSTEM_ADMIN`: `OK`
- `SCHOOL_ADMIN`: `OK` voi question school cua school minh khi permission update cho phep
- `TEACHER_OWNER`: `OK` voi question cua minh khi permission update cho phep
- `TEACHER_REVIEWER`: `NO`
- `TEACHER_UNRELATED`: `NO`
- `STUDENT`: `NO`

Rule xoa asset hien tai:

- chi duoc xoa khi question dang `DRAFT`
- khong co chuyen archive cho asset
- neu question khong con o `DRAFT` thi tu choi xoa

### Delete Evaluation Guide on `QUESTION`

`DELETE /api/v1/questions/{questionId}/evaluation-guide` dung cung nhom role voi update content:

- `SYSTEM_ADMIN`: `OK`
- `SCHOOL_ADMIN`: `OK` voi question school cua school minh khi permission update cho phep
- `TEACHER_OWNER`: `OK` voi question cua minh khi permission update cho phep
- `TEACHER_REVIEWER`: `NO`
- `TEACHER_UNRELATED`: `NO`
- `STUDENT`: `NO`

Rule xoa evaluation guide hien tai:

- chi duoc xoa khi question dang `DRAFT`
- khong co chuyen archive cho evaluation guide
- neu question khong con o `DRAFT` thi tu choi xoa

## Delete on `QUESTION_TOPIC`

`DELETE /api/v1/question-topics/{topicId}` dung cung nhom role voi update topic:

- `SYSTEM_ADMIN`: `OK`
- `SCHOOL_ADMIN`: `OK` voi topic duoc phep update
- `TEACHER_OWNER`: `NO`
- `TEACHER_REVIEWER`: `NO`
- `TEACHER_UNRELATED`: `NO`
- `STUDENT`: `NO`

Rule xoa topic hien tai:

- chi duoc xoa khi topic dang `DRAFT`
- khi xoa topic se xoa cung toan bo question, asset va evaluation guide ben duoi topic do
- neu topic khong con o `DRAFT` thi tu choi xoa

## Delete on `QUESTION_BANK`

`DELETE /api/v1/question-banks/{bankId}` dung cung nhom role voi update bank:

- `SYSTEM_ADMIN`: `OK`
- `SCHOOL_ADMIN`: `OK` voi bank duoc phep update
- `TEACHER_OWNER`: `NO`
- `TEACHER_REVIEWER`: `NO`
- `TEACHER_UNRELATED`: `NO`
- `STUDENT`: `NO`

Rule xoa bank hien tai:

- chi duoc xoa khi bank dang `DRAFT`
- khi xoa bank se xoa cung toan bo topic, question, asset va evaluation guide ben duoi bank do
- neu bank khong con o `DRAFT` thi tu choi xoa

### Scope = `CLASSROOM_ASSESSMENT`

| Role | View List | View Detail | Create | Update Content | Update Status |
|---|---|---|---|---|---|
| `SYSTEM_ADMIN` | `OK`: co the xuat hien trong `adminQuestions(...)` neu khong loai `scope = CLASSROOM_ASSESSMENT` | `OK`: xem read-only neu question khong `ARCHIVED`, qua `question(id)` | `NO`: chua co create flow rieng | `NO`: khong phai flow sua classroom hang ngay | `NO`: chua co review flow classroom |
| `SCHOOL_ADMIN` | `OK`: co the xuat hien trong `schoolQuestions(page, size, scope, status, type, keyword)` neu permission hop le; `schoolTopicQuestions(...)` chi dung khi classroom question van nam trong bank/topic hop le | `OK`: xem neu cung school, qua `question(id)` | `NO`: theo rule da chot, nha truong tao classroom question khong duoc | `NO`: school admin khong nen sua content classroom question nhu owner | `NO`: khong co review flow classroom |
| `TEACHER_OWNER` | `OK`: co the xuat hien trong `teacherQuestions(page, size, scope, status, type, keyword)` neu question do duoc query truc tiep theo rule; `teacherTopicQuestions(...)` chi dung khi classroom question van nam trong bank/topic hop le | `OK`: xem neu la nguoi tao, qua `question(id)` | `OK`: teacher la role phu hop de tao classroom question, nhung can endpoint/create flow rieng | `OK`: teacher owner la nguoi phu hop nhat de sua | `NO`: classroom khong nen co review workflow nhu question bank |
| `TEACHER_REVIEWER` | `NO`: classroom khong co reviewer flow ro | `NO`, tru khi sau nay bo sung assessment-specific permission | `NO` | `NO` | `NO` |
| `TEACHER_UNRELATED` | `NO` | `NO` | `NO` | `NO` | `NO` |
| `STUDENT` | `NO trong module question hien tai` | `NO trong module question hien tai` | `NO` | `NO` | `NO` |

### Scope = `CENTRAL_EXAM_DRAFT`

| Role | View List | View Detail | Create | Update Content | Update Status |
|---|---|---|---|---|---|
| `SYSTEM_ADMIN` | `OK`: co the xuat hien trong `adminQuestions(...)` neu khong loai `scope = CENTRAL_EXAM_DRAFT` | `OK`: xem neu khong `ARCHIVED`, qua `question(id)` | `NO`: chua co create flow rieng | `NO`: khong phai flow chinh trong code hien tai | `NO`: chua co workflow tach rieng |
| `SCHOOL_ADMIN` | `OK`: co the xuat hien trong `schoolQuestions(page, size, scope, status, type, keyword)` neu permission hop le | `OK`: xem neu cung school va question khong `ARCHIVED`, qua `question(id)` | `NO`: chua co endpoint rieng cho exam draft question | `OK`: co the la role quan ly cung school, nhung chua co endpoint chuyen biet | `OK`: neu team dung chung review-actions cho flow exam draft |
| `TEACHER_OWNER` | `OK`: co the xuat hien trong `teacherMyQuestions(...)` va `teacherQuestions(page, size, scope, status, type, keyword)` neu question do hop le theo rule | `OK`: xem neu la nguoi tao, qua `question(id)` | `NO`: chua co endpoint rieng cho exam draft question | `OK`: owner co the la nguoi sua draft exam question | `OK`: owner co the submit/publish theo flow exam draft neu team dung chung status |
| `TEACHER_REVIEWER` | `OK`: co the xuat hien trong `teacherQuestions(...)` hoac `teacherTopicQuestions(...)` neu rule reviewer hop le | `OK`: neu `SUBMITTED_FOR_REVIEW + REVIEWER_ONLY + cung school + khong phai creator`, qua `question(id)` | `NO` | `NO` | `OK`: reviewer co the approve/reject/revision neu team dung chung review flow |
| `TEACHER_UNRELATED` | `NO`, tru khi policy sau nay mo rong direct list cho exam draft publish | `OK rat hep`: chi khi `PUBLISHED + BANK_VISIBLE + cung school` theo permission hien tai | `NO` | `NO` | `NO` |
| `STUDENT` | `NO` | `NO` | `NO` | `NO` | `NO` |

### Scope = `CENTRAL_EXAM_PAPER`

| Role | View List | View Detail | Create | Update Content | Update Status |
|---|---|---|---|---|---|
| `SYSTEM_ADMIN` | `OK`: co the xuat hien trong `adminQuestions(...)` neu khong loai `scope = CENTRAL_EXAM_PAPER` | `OK`: xem duoc, qua `question(id)` | `NO`: chua co create flow rieng | `NO`: final paper khong nen sua tu do | `NO`: status rieng exam paper chua tach |
| `SCHOOL_ADMIN` | `OK`: co the xuat hien trong `schoolQuestions(page, size, scope, status, type, keyword)` neu permission hop le | `OK`: xem neu cung school, qua `question(id)` | `NO`: chua co create flow rieng | `NO`: final paper khong nen cho school admin sua truc tiep nhu content thuong | `OK`: neu team dung review flow chung, nhung ve nghiep vu nen rat han che |
| `TEACHER_OWNER` | `OK`: co the xuat hien trong `teacherMyQuestions(...)` va `teacherQuestions(page, size, scope, status, type, keyword)` neu question do hop le theo rule | `OK`: xem neu la nguoi tao, qua `question(id)` | `NO`: chua co create flow rieng | `NO`: final exam paper khong nen edit truc tiep; nen quay ve draft | `NO hoac rat han che` |
| `TEACHER_REVIEWER` | `NO`: hien chua co direct list reviewer-final-paper ro rang | `NO`: khong co reviewer-final-paper ro bang reviewerId | `NO` | `NO` | `NO hoac rat han che` |
| `TEACHER_UNRELATED` | `NO` | `NO` | `NO` | `NO` | `NO` |
| `STUDENT` | `NO trong module question hien tai` | `NO trong module question hien tai` | `NO` | `NO` | `NO` |

## Key Business Rules

### SCHOOL_ADMIN - View Detail on Question

`SCHOOL_ADMIN` duoc quyen `view detail` tren `question` khi:

- `scope = QUESTION_BANK` va:
  - question thuoc school minh, bank/topic/question khong `ARCHIVED`
  - hoac question thuoc `SYSTEM`, dong thoi:
    - bank `PUBLISHED`
    - topic `PUBLISHED`
    - question `PUBLISHED`
    - `visibility = BANK_VISIBLE`
- `scope = CLASSROOM_ASSESSMENT` va cung school
- `scope = CENTRAL_EXAM_DRAFT` va cung school, question khong `ARCHIVED`
- `scope = CENTRAL_EXAM_PAPER` va cung school

### TEACHER_OWNER - View Detail on Question

`TEACHER_OWNER` duoc quyen `view detail` tren `question` khi:

- la nguoi tao cau hoi
- hoac voi `scope = QUESTION_BANK`, cau hoi da:
  - `status = PUBLISHED`
  - `visibility = BANK_VISIBLE`
  - thuoc bank `SYSTEM` hoac school minh
  - bank/topic dang `PUBLISHED`

### TEACHER_REVIEWER - View Detail on Question

`TEACHER_REVIEWER` duoc quyen `view detail` tren `question` khi:

- cau hoi dang trong review queue:
  - `status = SUBMITTED_FOR_REVIEW`
  - `visibility = REVIEWER_ONLY`
  - khong phai do chinh reviewer tao
  - thuoc school cua reviewer

### TEACHER_UNRELATED - View Detail on Question

`TEACHER_UNRELATED` duoc quyen `view detail` tren `question` khi:

- voi `QUESTION_BANK`:
  - `status = PUBLISHED`
  - `visibility = BANK_VISIBLE`
  - bank/topic `PUBLISHED`
  - thuoc `SYSTEM` hoac school minh
- ngoai ra mac dinh khong duoc

## Question `QUESTION_BANK` - Detailed Action Rules

### Status Gates

`Question` update/delete khong chi phu thuoc role, ma con phu thuoc trang thai hien tai.

Voi `TEACHER_OWNER` va `SCHOOL_ADMIN`, `update content`, `update assets`, `update evaluation-guide` chi di qua duoc khi:

- `scope = QUESTION_BANK`
- `locked = false`
- bank va topic khong `ARCHIVED`
- question dang o mot trong cac trang thai:
  - `DRAFT`
  - `REVISION_REQUESTED`
  - `REJECTED`

Voi `TEACHER_OWNER` va `SCHOOL_ADMIN`, `DELETE /api/v1/questions/{questionId}` chi goi duoc khi van thoa toan bo dieu kien `canEditContent` o tren.

Sau khi da goi duoc `DELETE`:

- neu question dang `DRAFT` va chua duoc question khac tham chieu qua `sourceQuestionId` thi `HARD_DELETE`
- neu question dang `REVISION_REQUESTED` hoac `REJECTED` thi khong xoa cung, ma chuyen `ARCHIVED`

Voi `DELETE /api/v1/questions/{questionId}/assets` va `DELETE /api/v1/questions/{questionId}/evaluation-guide`:

- van phai thoa dieu kien `canEditContent`
- dong thoi question phai dang `DRAFT`
- neu question khong con o `DRAFT` thi tu choi xoa

Voi `SYSTEM_ADMIN`:

- code hien tai dang bypass `canEditContent` trong `QuestionPermissionQuery`
- vi vay system admin co quyen sua/xoa rong hon role khac
- day la hanh vi code hien tai, khong phai nghiep vu da duoc siet chat hoan toan

Voi `QuestionBank`:

- `PATCH /api/v1/question-banks/{bankId}` va `DELETE /api/v1/question-banks/{bankId}` chi di qua khi role thoa `canUpdateBank`
- `canUpdateBank` hien tai cho phep bank o:
  - `DRAFT`
  - `PUBLISHED`
- nhung `DELETE /api/v1/question-banks/{bankId}` con check them:
  - bank phai dang `DRAFT`
- neu khong phai `DRAFT` thi tu choi xoa

Voi `QuestionTopic`:

- `PUT /api/v1/question-topics/{id}` va `DELETE /api/v1/question-topics/{topicId}` chi di qua khi role thoa `canUpdateTopic`
- `canUpdateTopic` hien tai cho phep topic khi:
  - topic khong `ARCHIVED`
  - bank dang `DRAFT` hoac `PUBLISHED`
- nhung `DELETE /api/v1/question-topics/{topicId}` con check them:
  - topic phai dang `DRAFT`
- neu khong phai `DRAFT` thi tu choi xoa

### SYSTEM_ADMIN

`SYSTEM_ADMIN` duoc quyen `view list` tren `question` khi:

- xem toan bo danh sach qua `adminQuestions(page, size, includeArchived, status, keyword)`
- xem hang doi review qua `adminReviewQueue(page, size)`
- xem theo topic qua `adminTopicQuestions(bankId, topicId, page, size, includeArchived, scope, status, type, keyword)`

`SYSTEM_ADMIN` duoc quyen `create` tren `question` khi:

- tao system question qua `POST /api/v1/questions/system`

`SYSTEM_ADMIN` duoc quyen `update content` tren `question` khi:

- dung `PUT /api/v1/questions/{questionId}/content`
- dung `PUT /api/v1/questions/{questionId}/assets`
- dung `PUT /api/v1/questions/{questionId}/evaluation-guide`
- va question nam trong flow ma use case cho phep sua

`SYSTEM_ADMIN` duoc quyen `chuyen trang thai` tren `question` khi:

- dung `PATCH /api/v1/questions/{questionId}/review-actions`
- co the submit/review/approve/reject/publish/archive theo flow hien tai cua use case

### SCHOOL_ADMIN

`SCHOOL_ADMIN` duoc quyen `view list` tren `question` khi:

- xem danh sach truc tiep qua `schoolQuestions(page, size, scope, status, type, keyword)`
- xem hang doi review qua `schoolReviewQueue(page, size)`
- xem theo topic qua `schoolTopicQuestions(bankId, topicId, page, size, scope, status, type, keyword)`

Trong `scope = QUESTION_BANK`, `SCHOOL_ADMIN` thay duoc:

- question thuoc school minh neu bank/topic/question khong `ARCHIVED`
- question thuoc `SYSTEM` neu:
  - bank `PUBLISHED`
  - topic `PUBLISHED`
  - question `PUBLISHED`
  - `visibility = BANK_VISIBLE`

`SCHOOL_ADMIN` duoc quyen `create` tren `question` khi:

- tao school question qua `POST /api/v1/questions/school`

`SCHOOL_ADMIN` duoc quyen `update content` tren `question` khi:

- question thuoc school minh
- va status/scope hien tai van nam trong flow cho phep sua cua use case
- dung:
  - `PUT /api/v1/questions/{questionId}/content`
  - `PUT /api/v1/questions/{questionId}/assets`
  - `PUT /api/v1/questions/{questionId}/evaluation-guide`

`SCHOOL_ADMIN` duoc quyen `chuyen trang thai` tren `question` khi:

- dung `PATCH /api/v1/questions/{questionId}/review-actions`
- ap dung voi question thuoc school minh
- co the thuc hien cac buoc review/publish/archive theo flow hien tai

### TEACHER_OWNER

`TEACHER_OWNER` duoc quyen `view list` tren `question` khi:

- xem cau cua minh qua `teacherMyQuestions(page, size)`
- xem danh sach truc tiep qua `teacherQuestions(page, size, scope, status, type, keyword)`
- xem theo topic qua `teacherTopicQuestions(bankId, topicId, page, size, scope, status, type, keyword)`

Trong `scope = QUESTION_BANK`, `TEACHER_OWNER` thay duoc:

- tat ca cau cua chinh minh neu khong bi rule archive chan
- cau cua giao vien khac neu:
  - `status = PUBLISHED`
  - `visibility = BANK_VISIBLE`
  - bank/topic `PUBLISHED`
  - question thuoc `SYSTEM` hoac school minh

`TEACHER_OWNER` duoc quyen `create` tren `question` khi:

- tao school question trong school minh qua `POST /api/v1/questions/school`

`TEACHER_OWNER` duoc quyen `update content` tren `question` khi:

- la nguoi tao question
- question dang o trang thai duoc sua, dien hinh:
  - `DRAFT`
  - `REVISION_REQUESTED`
  - `REJECTED`
- dung:
  - `PUT /api/v1/questions/{questionId}/content`
  - `PUT /api/v1/questions/{questionId}/assets`
  - `PUT /api/v1/questions/{questionId}/evaluation-guide`

`TEACHER_OWNER` duoc quyen `chuyen trang thai` tren `question` khi:

- dung `PATCH /api/v1/questions/{questionId}/review-actions`
- co the submit for review va cac buoc owner duoc phep trong flow
- khong mac dinh co nghia la tu approve cau cua minh

### TEACHER_REVIEWER

`TEACHER_REVIEWER` duoc quyen `view list` tren `question` khi:

- xem queue review qua `teacherReviewQueue(page, size)`
- co the thay trong `teacherQuestions(...)` hoac `teacherTopicQuestions(...)` neu query do tra ve dung rule reviewer

Trong `scope = QUESTION_BANK`, `TEACHER_REVIEWER` thay duoc question khi:

- `status = SUBMITTED_FOR_REVIEW`
- `visibility = REVIEWER_ONLY`
- khong phai do chinh reviewer tao
- question thuoc school cua reviewer

`TEACHER_REVIEWER` duoc quyen `create` tren `question` khi:

- `NO` theo vai reviewer

`TEACHER_REVIEWER` duoc quyen `update content` tren `question` khi:

- `NO`: reviewer khong sua content cau nguoi khac

`TEACHER_REVIEWER` duoc quyen `chuyen trang thai` tren `question` khi:

- dung `PATCH /api/v1/questions/{questionId}/review-actions`
- co the `approve`, `reject`, `revision requested` khi question nam trong review queue hop le

### TEACHER_UNRELATED

`TEACHER_UNRELATED` duoc quyen `view list` tren `question` khi:

- xem qua `teacherQuestions(page, size, scope, status, type, keyword)`
- xem qua `teacherTopicQuestions(bankId, topicId, page, size, scope, status, type, keyword)`

Trong `scope = QUESTION_BANK`, `TEACHER_UNRELATED` thay duoc question khi:

- `status = PUBLISHED`
- `visibility = BANK_VISIBLE`
- bank/topic `PUBLISHED`
- question thuoc `SYSTEM` hoac school minh

Noi cach khac, giao vien khong chi xem duoc cau cua minh, ma van xem duoc cau cua giao vien khac trong truong neu cau do da `PUBLISHED` va `BANK_VISIBLE`.

`TEACHER_UNRELATED` duoc quyen `create` tren `question` khi:

- `NO`: khong tao duoi nghia thao tac voi question khong phai cua minh

`TEACHER_UNRELATED` duoc quyen `update content` tren `question` khi:

- `NO`

`TEACHER_UNRELATED` duoc quyen `chuyen trang thai` tren `question` khi:

- `NO`
