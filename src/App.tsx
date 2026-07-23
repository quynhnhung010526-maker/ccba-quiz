import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileUp,
  Layers3,
  ListChecks,
  RefreshCw,
  RotateCcw,
  Search,
  Shuffle,
  Trash2,
  Trophy,
  XCircle,
} from 'lucide-react';

type RawSet = {
  id: string;
  title: string;
  fileName: string;
  raw: string;
};

type DefaultQuizFile = {
  id: string;
  fallbackTitle: string;
  fileName: string;
};

type Option = {
  id: string;
  originalLabel: string;
  text: string;
  isCorrect: boolean;
};

type Question = {
  id: string;
  sourceSetId: string;
  sourceTitle: string;
  originalNumber: number;
  text: string;
  options: Option[];
};

type QuizSet = {
  id: string;
  title: string;
  description: string;
  fileName: string;
  questions: Question[];
};

type QuizSession = {
  setId: string;
  setTitle: string;
  questions: Question[];
  answers: Record<string, string>;
  submitted: boolean;
};

type ImportReport = {
  fileCount: number;
  parsedQuestionCount: number;
  warnings: string[];
};

type OptionPosition = {
  index: number;
  label: string;
};

type SavedQuizStorage = {
  version: number;
  rawSets: RawSet[];
  selectedSetId: string;
  questionLimit: string;
  updatedAt: string;
};

type KeywordItem = {
  en: string;
  vi: string;
  appearsInQuestion: boolean;
};

type LearningNote = {
  status: 'loading' | 'ready' | 'error';
  keywords: KeywordItem[];
  questionVi: string;
  correctAnswerVi: string;
  errorMessage?: string;
};


type BabokTopicKind =
  | 'chapter'
  | 'concept'
  | 'task'
  | 'competency'
  | 'technique'
  | 'perspective';

type BabokTopic = {
  id: string;
  kind: BabokTopicKind;
  chapter: string;
  section: string;
  titleEn: string;
  titleVi: string;
  bookPage: number;
  aliases: string[];
  summaryVi: string;
};

type BabokFocus = {
  sectionLabel: string;
  focusName: string;
  readingGuide: string;
};

type BilingualStudyItem = {
  en: string;
  vi: string;
};

type BabokOptionReason = {
  label: string;
  optionId: string;
  optionText: string;
  isCorrect: boolean;
  relatedTopic?: BabokTopic;
  explanationVi: string;
};

type BabokStudyGuide = {
  primary: BabokTopic;
  related: BabokTopic[];
  focus: BabokFocus;
  answerTakeaway: string;
  questionIntent: BilingualStudyItem;
  memoryRule: BilingualStudyItem;
  optionReasons: BabokOptionReason[];
};

const STORAGE_VERSION = 2;
const STORAGE_KEY = `ccba-practice-quiz-storage-v${STORAGE_VERSION}`;

// Đặt 9 file .txt của bạn vào: public/
// Tên file phải khớp với danh sách dưới đây.
const DEFAULT_QUIZ_FILES: DefaultQuizFile[] = [
  { id: 'default-1', fallbackTitle: 'Bộ 1 - CCBA Practice', fileName: 'CCBA1.txt' },
  { id: 'default-2', fallbackTitle: 'Bộ 2 - CCBA Practice', fileName: 'CCBA2.txt' },
  { id: 'default-3', fallbackTitle: 'Bộ 3 - CCBA Practice', fileName: 'CCBA3.txt' },
  { id: 'default-4', fallbackTitle: 'Bộ 4 - CCBA Practice', fileName: 'CCBA4.txt' },
  { id: 'default-5', fallbackTitle: 'Bộ 5 - CCBA Practice', fileName: 'CCBA5.txt' },
  { id: 'default-6', fallbackTitle: 'Bộ 6 - CCBA Practice', fileName: 'CCBA6.txt' },
  { id: 'default-7', fallbackTitle: 'Bộ 7 - CCBA Practice', fileName: 'CCBA7.txt' },
  { id: 'default-8', fallbackTitle: 'Bộ 8 - CCBA Practice', fileName: 'CCBA8.txt' },
  { id: 'default-9', fallbackTitle: 'Bộ 9 - CCBA Practice', fileName: 'CCBA9.txt' },
];

const DEMO_RAW_SETS: RawSet[] = [
  {
    id: 'demo-1',
    title: 'Bộ mẫu - Chưa tìm thấy file mặc định',
    fileName: 'demo.txt',
    raw: `CCBA Practice - Demo

Question 1
What are the inputs to the manage stakeholder collaboration task?
A)Business analysis approach and business analysis performance assessment
B)Stakeholder engagement approach and business analysis performance assessment => True
C)Stakeholder engagement approach and information management approach
D)Stakeholder engagement approach and business analysis approach

Question 2
Which task provides stakeholders with the information they need, at the time they need it?
A)Conduct elicitation
B)Confirm elicitation results
C)Communicate business analysis information => True
D)Manage stakeholder collaboration

Question 3What term describes the money and effort already committed to an initiative?A)Opportunity costB)Additional costC)Net present valueD)Sunk cost => True`,
  },
];

const ANSWER_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
const TRANSLATION_CACHE_KEY = 'ccba-vi-translation-cache-v1';

const KEYWORD_GLOSSARY: Array<{ en: string; vi: string }> = [
  { en: 'business analysis approach', vi: 'phương pháp phân tích nghiệp vụ' },
  { en: 'business analysis information', vi: 'thông tin phân tích nghiệp vụ' },
  { en: 'business analysis performance assessment', vi: 'đánh giá hiệu suất phân tích nghiệp vụ' },
  { en: 'business analysis performance improvements', vi: 'cải tiến hiệu suất phân tích nghiệp vụ' },
  { en: 'stakeholder engagement approach', vi: 'phương pháp gắn kết bên liên quan' },
  { en: 'manage stakeholder collaboration', vi: 'quản lý sự cộng tác của bên liên quan' },
  { en: 'communicate business analysis information', vi: 'truyền đạt thông tin phân tích nghiệp vụ' },
  { en: 'prepare for elicitation', vi: 'chuẩn bị khai thác thông tin' },
  { en: 'conduct elicitation', vi: 'thực hiện khai thác thông tin' },
  { en: 'confirm elicitation results', vi: 'xác nhận kết quả khai thác thông tin' },
  { en: 'elicitation and collaboration', vi: 'khai thác thông tin và cộng tác' },
  { en: 'plan stakeholder engagement', vi: 'lập kế hoạch gắn kết bên liên quan' },
  { en: 'plan business analysis governance', vi: 'lập kế hoạch quản trị phân tích nghiệp vụ' },
  { en: 'plan business analysis information management', vi: 'lập kế hoạch quản lý thông tin phân tích nghiệp vụ' },
  { en: 'information management approach', vi: 'phương pháp quản lý thông tin' },
  { en: 'governance approach', vi: 'phương pháp quản trị' },
  { en: 'change control', vi: 'kiểm soát thay đổi' },
  { en: 'requirements traceability', vi: 'truy xuất nguồn gốc yêu cầu' },
  { en: 'traceability approach', vi: 'phương pháp truy xuất yêu cầu' },
  { en: 'requirements life cycle management', vi: 'quản lý vòng đời yêu cầu' },
  { en: 'maintain requirements', vi: 'duy trì yêu cầu' },
  { en: 'prioritize requirements', vi: 'ưu tiên yêu cầu' },
  { en: 'assess requirements changes', vi: 'đánh giá thay đổi yêu cầu' },
  { en: 'approve requirements', vi: 'phê duyệt yêu cầu' },
  { en: 'requirements architecture', vi: 'kiến trúc yêu cầu' },
  { en: 'specify and model requirements', vi: 'đặc tả và mô hình hóa yêu cầu' },
  { en: 'verify requirements', vi: 'xác minh yêu cầu' },
  { en: 'validate requirements', vi: 'thẩm định yêu cầu' },
  { en: 'define design options', vi: 'xác định các phương án thiết kế' },
  { en: 'analyze potential value and recommend solution', vi: 'phân tích giá trị tiềm năng và đề xuất giải pháp' },
  { en: 'requirements analysis and design definition', vi: 'phân tích yêu cầu và xác định thiết kế' },
  { en: 'current state', vi: 'trạng thái hiện tại' },
  { en: 'future state', vi: 'trạng thái tương lai' },
  { en: 'define change strategy', vi: 'xác định chiến lược thay đổi' },
  { en: 'change strategy', vi: 'chiến lược thay đổi' },
  { en: 'business need', vi: 'nhu cầu kinh doanh' },
  { en: 'business objective', vi: 'mục tiêu kinh doanh' },
  { en: 'business objectives', vi: 'các mục tiêu kinh doanh' },
  { en: 'business case', vi: 'luận chứng kinh doanh' },
  { en: 'desired outcomes', vi: 'kết quả mong muốn' },
  { en: 'potential value', vi: 'giá trị tiềm năng' },
  { en: 'realized value', vi: 'giá trị đã hiện thực hóa' },
  { en: 'solution scope', vi: 'phạm vi giải pháp' },
  { en: 'solution performance measures', vi: 'thước đo hiệu suất giải pháp' },
  { en: 'measure solution performance', vi: 'đo lường hiệu suất giải pháp' },
  { en: 'analyze performance measures', vi: 'phân tích thước đo hiệu suất' },
  { en: 'assess solution limitations', vi: 'đánh giá hạn chế của giải pháp' },
  { en: 'assess enterprise limitations', vi: 'đánh giá hạn chế của doanh nghiệp' },
  { en: 'recommend actions to increase solution value', vi: 'đề xuất hành động tăng giá trị giải pháp' },
  { en: 'solution evaluation', vi: 'đánh giá giải pháp' },
  { en: 'stakeholder analysis', vi: 'phân tích bên liên quan' },
  { en: 'stakeholder register', vi: 'sổ đăng ký bên liên quan' },
  { en: 'stakeholder', vi: 'bên liên quan' },
  { en: 'stakeholders', vi: 'các bên liên quan' },
  { en: 'domain subject matter expert', vi: 'chuyên gia nghiệp vụ lĩnh vực' },
  { en: 'implementation subject matter expert', vi: 'chuyên gia triển khai' },
  { en: 'operational support', vi: 'hỗ trợ vận hành' },
  { en: 'project manager', vi: 'quản lý dự án' },
  { en: 'sponsor', vi: 'nhà tài trợ' },
  { en: 'regulator', vi: 'cơ quan quản lý' },
  { en: 'root cause analysis', vi: 'phân tích nguyên nhân gốc rễ' },
  { en: 'process modeling', vi: 'mô hình hóa quy trình' },
  { en: 'scope modeling', vi: 'mô hình hóa phạm vi' },
  { en: 'data flow diagram', vi: 'sơ đồ luồng dữ liệu' },
  { en: 'sequence diagram', vi: 'sơ đồ tuần tự' },
  { en: 'use case', vi: 'ca sử dụng' },
  { en: 'functional decomposition', vi: 'phân rã chức năng' },
  { en: 'non-functional requirements', vi: 'yêu cầu phi chức năng' },
  { en: 'acceptance criteria', vi: 'tiêu chí chấp nhận' },
  { en: 'metrics and key performance indicators', vi: 'chỉ số đo lường và KPI' },
  { en: 'key performance indicators', vi: 'chỉ số hiệu suất chính' },
  { en: 'performance measures', vi: 'thước đo hiệu suất' },
  { en: 'adaptive approach', vi: 'phương pháp thích ứng' },
  { en: 'predictive approach', vi: 'phương pháp dự đoán' },
  { en: 'sunk cost', vi: 'chi phí chìm' },
  { en: 'opportunity cost', vi: 'chi phí cơ hội' },
  { en: 'return on investment', vi: 'tỷ suất hoàn vốn' },
  { en: 'risk', vi: 'rủi ro' },
  { en: 'constraint', vi: 'ràng buộc' },
  { en: 'assumption', vi: 'giả định' },
  { en: 'dependency', vi: 'sự phụ thuộc' },
  { en: 'requirements', vi: 'yêu cầu' },
  { en: 'designs', vi: 'thiết kế' },
  { en: 'solution', vi: 'giải pháp' },
];

const ENGLISH_STOP_WORDS = new Set([
  'about', 'after', 'again', 'against', 'because', 'before', 'being', 'between',
  'could', 'does', 'during', 'following', 'from', 'have', 'having', 'into',
  'most', 'other', 'should', 'some', 'such', 'than', 'that', 'their', 'there',
  'these', 'they', 'this', 'those', 'through', 'under', 'using', 'very', 'what',
  'when', 'where', 'which', 'while', 'with', 'would', 'your', 'following',
  'business', 'analyst', 'organization', 'project', 'following', 'activity',
  'task', 'tasks', 'statement', 'statements', 'option', 'options', 'example',
]);



// File PDF được phục vụ trực tiếp từ thư mục public của dự án.
// Cấu trúc cần có: public/BABOK v3 (1).pdf
// Không import PDF vào component và không cần tải PDF qua giao diện ứng dụng.
const BABOK_PDF_PUBLIC_FILE = 'BABOK v3 (1).pdf';
// Trang in số 1 của BABOK nằm ở trang PDF số 11, do đó chênh lệch là 10 trang.
const BABOK_PDF_PAGE_OFFSET = 10;

function createBabokTopic(
  kind: BabokTopicKind,
  chapter: string,
  section: string,
  titleEn: string,
  titleVi: string,
  bookPage: number,
  aliases: string[],
  summaryVi: string
): BabokTopic {
  return {
    id: `${section}-${titleEn}`,
    kind,
    chapter,
    section,
    titleEn,
    titleVi,
    bookPage,
    aliases: Array.from(new Set([titleEn, titleVi, ...aliases])),
    summaryVi,
  };
}

const BABOK_TOPICS: BabokTopic[] = [
  createBabokTopic("chapter", "Chapter 1: Introduction", "Chapter 1", "Introduction", "Giới thiệu", 1, ["purpose of the babok guide", "what is business analysis", "who is a business analyst", "structure of the babok guide", "babok guide"], "Nắm mục đích, phạm vi và cấu trúc của BABOK: knowledge areas, tasks, techniques, competencies và perspectives; BABOK mô tả thực hành được chấp nhận rộng rãi chứ không áp đặt một quy trình duy nhất."),
  createBabokTopic("chapter", "Chapter 2: Business Analysis Key Concepts", "Chapter 2", "Business Analysis Key Concepts", "Các khái niệm chính của phân tích nghiệp vụ", 11, ["business analysis key concepts", "key concepts chapter"], "Chapter 2 cung cấp nền tảng để đọc toàn bộ BABOK, gồm BACCM, các thuật ngữ chính, phân loại requirements, các stakeholder roles và mối quan hệ giữa requirements với designs."),
  createBabokTopic("concept", "Chapter 2: Business Analysis Key Concepts", "2.1", "The Business Analysis Core Concept Model (BACCM)", "Mô hình khái niệm cốt lõi BACCM", 12, ["baccm", "business analysis core concept model", "change need solution stakeholder value context", "core concept"], "BACCM gồm sáu khái niệm liên kết ngang nhau: Change, Need, Solution, Stakeholder, Value và Context. Khi một khái niệm thay đổi, cần đánh giá lại quan hệ của cả sáu đối với việc tạo giá trị."),
  createBabokTopic("concept", "Chapter 2: Business Analysis Key Concepts", "2.2", "Key Terms", "Các thuật ngữ chính", 14, ["business analysis information", "enterprise", "organization", "plan", "requirement definition", "risk definition", "key terms"], "Mục này định nghĩa các thuật ngữ nền tảng như business analysis information, requirement, design, enterprise, organization, plan và risk; nhiều câu thi kiểm tra ranh giới giữa các khái niệm này."),
  createBabokTopic("concept", "Chapter 2: Business Analysis Key Concepts", "2.3", "Requirements Classification Schema", "Phân loại yêu cầu", 16, ["requirements classification schema", "business requirements", "stakeholder requirements", "solution requirements", "functional requirements", "non-functional requirements", "transition requirements", "quality of service requirements"], "Phân biệt business, stakeholder, solution và transition requirements. Solution requirements gồm functional và non-functional; transition requirements chỉ cần trong quá trình chuyển từ current state sang future state."),
  createBabokTopic("concept", "Chapter 2: Business Analysis Key Concepts", "2.4", "Stakeholders", "Các vai trò bên liên quan", 16, ["stakeholder roles", "business analyst customer domain subject matter expert end user", "implementation subject matter expert", "operational support", "project manager", "regulator", "sponsor", "supplier", "tester"], "Hiểu trách nhiệm của các stakeholder chuẩn trong BABOK và nhớ rằng một người có thể giữ nhiều vai trò; danh sách stakeholder của từng task là vai trò có khả năng tham gia hoặc bị ảnh hưởng, không phải yêu cầu bắt buộc."),
  createBabokTopic("concept", "Chapter 2: Business Analysis Key Concepts", "2.5", "Requirements and Designs", "Yêu cầu và thiết kế", 19, ["requirements and designs", "requirement and design", "requirements versus designs", "requirements vs designs"], "Requirements tập trung vào nhu cầu và giá trị cần đạt; designs tập trung vào cách giải pháp hiện thực hóa giá trị. Ranh giới phụ thuộc vào ngữ cảnh, người sử dụng thông tin và mức độ chi tiết."),
  createBabokTopic("chapter", "Chapter 3: Business Analysis Planning and Monitoring", "Chapter 3", "Business Analysis Planning and Monitoring", "Lập kế hoạch và giám sát phân tích nghiệp vụ", 21, ["business analysis planning and monitoring", "planning and monitoring knowledge area"], "Knowledge area này tổ chức và điều phối công việc BA, stakeholder, cơ chế quản trị, quản lý thông tin và đo lường hiệu suất BA; các đầu ra của nó là hướng dẫn quan trọng cho các knowledge area khác."),
  createBabokTopic("chapter", "Chapter 4: Elicitation and Collaboration", "Chapter 4", "Elicitation and Collaboration", "Khai thác thông tin và cộng tác", 53, ["elicitation and collaboration", "elicitation knowledge area"], "Knowledge area này bao quát chuẩn bị, thực hiện và xác nhận elicitation; truyền đạt business analysis information; và duy trì sự cộng tác của stakeholder trong suốt initiative."),
  createBabokTopic("chapter", "Chapter 5: Requirements Life Cycle Management", "Chapter 5", "Requirements Life Cycle Management", "Quản lý vòng đời yêu cầu", 77, ["requirements life cycle management", "requirement life cycle management"], "Knowledge area này quản lý requirements và designs từ khi hình thành đến khi ngừng sử dụng thông qua trace, maintain, prioritize, assess changes và approve."),
  createBabokTopic("chapter", "Chapter 6: Strategy Analysis", "Chapter 6", "Strategy Analysis", "Phân tích chiến lược", 99, ["strategy analysis", "strategy analysis knowledge area"], "Strategy Analysis xác định business need, hiểu current state, định nghĩa future state, đánh giá risk và xây dựng change strategy để chuyển đổi có kiểm soát và tạo giá trị."),
  createBabokTopic("chapter", "Chapter 7: Requirements Analysis and Design Definition", "Chapter 7", "Requirements Analysis and Design Definition", "Phân tích yêu cầu và xác định thiết kế", 133, ["requirements analysis and design definition", "radd", "requirements analysis knowledge area"], "RADD biến thông tin elicitation thành requirements và designs có cấu trúc, được verify và validate; sau đó xác định design options và đề xuất solution dựa trên potential value."),
  createBabokTopic("chapter", "Chapter 8: Solution Evaluation", "Chapter 8", "Solution Evaluation", "Đánh giá giải pháp", 163, ["solution evaluation", "solution evaluation knowledge area"], "Solution Evaluation đo và phân tích hiệu suất solution đang dùng, xác định solution/enterprise limitations và đề xuất hành động để tăng realized value."),
  createBabokTopic("task", "Chapter 3: Business Analysis Planning and Monitoring", "3.1", "Plan Business Analysis Approach", "Lập kế hoạch phương pháp phân tích nghiệp vụ", 24, ["plan business analysis approach", "business analysis approach", "adaptive approach", "adaptive", "predictive approach", "predictive", "plan-driven approach", "waterfall"], "Xác định cách thức tổng thể để thực hiện BA work: phương pháp, thời điểm, task, deliverable, kỹ thuật và mức độ hình thức; approach phải phù hợp bối cảnh, rủi ro, mục tiêu thay đổi và chuẩn của tổ chức."),
  createBabokTopic("task", "Chapter 3: Business Analysis Planning and Monitoring", "3.2", "Plan Stakeholder Engagement", "Lập kế hoạch gắn kết bên liên quan", 31, ["plan stakeholder engagement", "stakeholder engagement approach", "stakeholder analysis", "stakeholder list map or personas", "roles and responsibilities", "stakeholder attitudes"], "Xác định stakeholder liên quan, đặc điểm, vai trò, nhu cầu thông tin, mức ảnh hưởng và cách cộng tác phù hợp; đầu ra là Stakeholder Engagement Approach."),
  createBabokTopic("task", "Chapter 3: Business Analysis Planning and Monitoring", "3.3", "Plan Business Analysis Governance", "Lập kế hoạch quản trị phân tích nghiệp vụ", 37, ["plan business analysis governance", "governance approach", "decision making", "change control process", "prioritization approach", "plan for approvals", "approval authority"], "Thiết lập cách ra quyết định, ưu tiên, phê duyệt và kiểm soát thay đổi đối với business analysis information để quyết định nhất quán và đúng thẩm quyền."),
  createBabokTopic("task", "Chapter 3: Business Analysis Planning and Monitoring", "3.4", "Plan Business Analysis Information Management", "Lập kế hoạch quản lý thông tin phân tích nghiệp vụ", 42, ["plan business analysis information management", "information management approach", "requirements reuse", "plan for requirements reuse", "organization of business analysis information", "repository", "level of abstraction"], "Xác định cách thu thập, tổ chức, lưu trữ, truy cập, truy xuất, bảo mật và tái sử dụng requirements, designs và các business analysis information khác."),
  createBabokTopic("task", "Chapter 3: Business Analysis Planning and Monitoring", "3.5", "Identify Business Analysis Performance Improvements", "Xác định cải tiến hiệu suất phân tích nghiệp vụ", 47, ["identify business analysis performance improvements", "business analysis performance assessment", "business analysis performance improvements", "performance objectives", "corrective action", "preventive action"], "Định nghĩa hiệu suất BA hiệu quả, xác lập measures, phân tích kết quả và đề xuất corrective/preventive actions để cải tiến liên tục."),
  createBabokTopic("task", "Chapter 4: Elicitation and Collaboration", "4.1", "Prepare for Elicitation", "Chuẩn bị khai thác thông tin", 56, ["prepare for elicitation", "elicitation activity plan", "elicitation objectives", "supporting materials", "elicitation scope", "elicitation logistics"], "Làm rõ mục tiêu và phạm vi elicitation, chọn kỹ thuật, chuẩn bị nguồn lực/tài liệu, lịch và logistics để hoạt động elicitation có thể diễn ra hiệu quả."),
  createBabokTopic("task", "Chapter 4: Elicitation and Collaboration", "4.2", "Conduct Elicitation", "Thực hiện khai thác thông tin", 61, ["conduct elicitation", "elicitation results unconfirmed", "elicitation results", "collaborative elicitation", "research elicitation", "experiment elicitation", "collaborative research experiments", "research", "experiments"], "Thực hiện hoạt động elicitation để khám phá, thử nghiệm hoặc xác nhận thông tin; kết quả ban đầu là Elicitation Results (Unconfirmed) và cần được ghi nhận trước khi confirm."),
  createBabokTopic("task", "Chapter 4: Elicitation and Collaboration", "4.3", "Confirm Elicitation Results", "Xác nhận kết quả khai thác thông tin", 65, ["confirm elicitation results", "elicitation results confirmed", "confirm elicitation"], "So sánh kết quả elicitation với nguồn khác, kiểm tra tính chính xác và nhất quán, giải quyết mâu thuẫn để tạo Elicitation Results (Confirmed)."),
  createBabokTopic("task", "Chapter 4: Elicitation and Collaboration", "4.4", "Communicate Business Analysis Information", "Truyền đạt thông tin phân tích nghiệp vụ", 67, ["communicate business analysis information", "business analysis information communicated", "business analysis information package", "formal documentation", "informal documentation", "communication package"], "Đóng gói và truyền đạt đúng nội dung, mức chi tiết, định dạng và thời điểm cho từng stakeholder nhằm tạo shared understanding và hỗ trợ quyết định."),
  createBabokTopic("task", "Chapter 4: Elicitation and Collaboration", "4.5", "Manage Stakeholder Collaboration", "Quản lý sự cộng tác của bên liên quan", 71, ["manage stakeholder collaboration", "stakeholder collaboration", "stakeholder engagement risks", "stakeholder participation"], "Theo dõi mức tham gia, quan hệ và thái độ của stakeholder; xử lý rào cản cộng tác để duy trì sự tham gia cần thiết trong toàn bộ BA work."),
  createBabokTopic("task", "Chapter 5: Requirements Life Cycle Management", "5.1", "Trace Requirements", "Truy xuất yêu cầu", 79, ["trace requirements", "requirements traceability", "traceability approach", "derive depends satisfy validate", "traceability relationship"], "Thiết lập và duy trì quan hệ giữa requirements, designs, business objectives và solution components để hỗ trợ phân tích tác động, phạm vi, kiểm thử và kiểm soát thay đổi."),
  createBabokTopic("task", "Chapter 5: Requirements Life Cycle Management", "5.2", "Maintain Requirements", "Duy trì yêu cầu", 83, ["maintain requirements", "requirements maintenance", "requirements reuse", "reusable requirements", "requirements attributes"], "Giữ requirements và designs chính xác, nhất quán, cập nhật và có thể tái sử dụng trong suốt vòng đời; duy trì attributes và trạng thái cần thiết."),
  createBabokTopic("task", "Chapter 5: Requirements Life Cycle Management", "5.3", "Prioritize Requirements", "Ưu tiên yêu cầu", 86, ["prioritize requirements", "requirements prioritized", "designs prioritized", "continual prioritization", "basis for prioritization", "rationale for prioritization", "challenges of prioritization", "priority of the requirements", "update the priority", "requirements priority"], "Xếp hạng tương đối requirements/designs dựa trên value, risk, cost, dependency, time sensitivity, compliance và các ràng buộc; ưu tiên có thể thay đổi liên tục khi có thông tin mới."),
  createBabokTopic("task", "Chapter 5: Requirements Life Cycle Management", "5.4", "Assess Requirements Changes", "Đánh giá thay đổi yêu cầu", 91, ["assess requirements changes", "requirements change assessment", "designs change assessment", "impact analysis", "proposed change", "change assessment"], "Đánh giá lợi ích, chi phí, impact, risk, dependency và ảnh hưởng tới scope/stakeholder trước khi khuyến nghị chấp nhận, từ chối hoặc hoãn thay đổi."),
  createBabokTopic("task", "Chapter 5: Requirements Life Cycle Management", "5.5", "Approve Requirements", "Phê duyệt yêu cầu", 95, ["approve requirements", "requirements approved", "designs approved", "requirements approval", "sign-off", "approval workshop", "gaining approval", "approval of requirements"], "Đạt agreement và approval từ đúng người có thẩm quyền; xác định và quản lý risk khi không có đồng thuận hoàn toàn, đồng thời ghi nhận quyết định."),
  createBabokTopic("task", "Chapter 6: Strategy Analysis", "6.1", "Analyze Current State", "Phân tích trạng thái hiện tại", 103, ["analyze current state", "current state description", "current state", "business need", "internal assets", "external influencers", "current capabilities"], "Hiểu business need, current capabilities, processes, structures, culture, assets và external influencers; chỉ phân tích sâu đến mức cần để đánh giá thay đổi và xác định nguyên nhân thực."),
  createBabokTopic("task", "Chapter 6: Strategy Analysis", "6.2", "Define Future State", "Xác định trạng thái tương lai", 110, ["define future state", "future state description", "future state", "business objectives", "desired outcomes", "potential value", "future capabilities"], "Mô tả business objectives, desired outcomes, scope, constraints, assumptions, potential value và capabilities cần có trong future state; objectives cần rõ và đo lường được."),
  createBabokTopic("task", "Chapter 6: Strategy Analysis", "6.3", "Assess Risks", "Đánh giá rủi ro", 120, ["assess risks", "risk assessment", "risk tolerance", "risk analysis", "uncertainty on value"], "Xác định và phân tích uncertainty có thể ảnh hưởng value, đánh giá likelihood/impact và risk tolerance để lựa chọn response phù hợp."),
  createBabokTopic("task", "Chapter 6: Strategy Analysis", "6.4", "Define Change Strategy", "Xác định chiến lược thay đổi", 124, ["define change strategy", "change strategy", "transition state", "gap analysis", "solution scope", "change recommendation"], "Xác định cách chuyển từ current state sang future state bằng cách so sánh capability gaps, đánh giá solution scope, transition states, release/timing và readiness của tổ chức."),
  createBabokTopic("task", "Chapter 7: Requirements Analysis and Design Definition", "7.1", "Specify and Model Requirements", "Đặc tả và mô hình hóa yêu cầu", 136, ["specify and model requirements", "requirements specified and modeled", "stakeholder requirements", "solution requirements", "model requirements"], "Chuyển elicitation results thành requirements/designs rõ ràng bằng văn bản hoặc models phù hợp, dùng mức trừu tượng và ký pháp đáp ứng nhu cầu stakeholder."),
  createBabokTopic("task", "Chapter 7: Requirements Analysis and Design Definition", "7.2", "Verify Requirements", "Xác minh yêu cầu", 141, ["verify requirements", "requirements verified", "designs verified", "requirements quality characteristics", "atomic testable consistent feasible complete understandable", "unambiguous concise", "atomic", "quality characteristic", "requirements quality"], "Kiểm tra chất lượng của requirements/designs: atomic, complete, consistent, concise, feasible, unambiguous, testable, understandable và phù hợp chuẩn/ký pháp."),
  createBabokTopic("task", "Chapter 7: Requirements Analysis and Design Definition", "7.3", "Validate Requirements", "Thẩm định yêu cầu", 144, ["validate requirements", "requirements validated", "designs validated", "right requirements", "business objectives and potential value", "validating requirements", "validation criteria", "missing requirements"], "Xác nhận requirements/designs phù hợp business need, business objectives và future state, hỗ trợ potential value và không bỏ sót yêu cầu cần thiết."),
  createBabokTopic("task", "Chapter 7: Requirements Analysis and Design Definition", "7.4", "Define Requirements Architecture", "Xác định kiến trúc yêu cầu", 148, ["define requirements architecture", "requirements architecture", "requirements architecture aligned", "requirements architecture complete", "requirements relationships", "template architectures", "illustrate relationships between requirements"], "Tổ chức requirements/designs thành một kiến trúc thống nhất, thể hiện mối quan hệ, viewpoints và tính đầy đủ/phù hợp để toàn bộ tập thông tin hoạt động như một chỉnh thể."),
  createBabokTopic("task", "Chapter 7: Requirements Analysis and Design Definition", "7.5", "Define Design Options", "Xác định các phương án thiết kế", 152, ["define design options", "design options", "requirements allocation", "solution approach", "design option"], "Xác định nhiều cách đáp ứng requirements, mô tả solution approach, phân bổ requirements và nhận diện cơ hội cải thiện để tạo các design options khả thi."),
  createBabokTopic("task", "Chapter 7: Requirements Analysis and Design Definition", "7.6", "Analyze Potential Value and Recommend Solution", "Phân tích giá trị tiềm năng và đề xuất giải pháp", 157, ["analyze potential value and recommend solution", "potential value and recommend solution", "recommend solution", "solution recommendation", "trade-offs", "design option value"], "So sánh design options theo potential value, cost, risk, constraints, available resources và trade-offs; đề xuất lựa chọn mang lại value tổng thể tốt nhất trong context."),
  createBabokTopic("task", "Chapter 8: Solution Evaluation", "8.1", "Measure Solution Performance", "Đo lường hiệu suất giải pháp", 166, ["measure solution performance", "solution performance measures", "performance measurements", "measurement frequency", "measurement timing", "measurement volume", "volume", "frequency", "timing"], "Xác định và thu thập measures phù hợp với business objectives/potential value; bảo đảm có phương pháp, ownership, timing, frequency và dữ liệu cần thiết để đo."),
  createBabokTopic("task", "Chapter 8: Solution Evaluation", "8.2", "Analyze Performance Measures", "Phân tích thước đo hiệu suất", 170, ["analyze performance measures", "solution performance analysis", "performance trends", "performance results"], "Phân tích measurements, xu hướng, độ chính xác và chênh lệch so với expected value để xác định solution đang tạo ra value đến mức nào."),
  createBabokTopic("task", "Chapter 8: Solution Evaluation", "8.3", "Assess Solution Limitations", "Đánh giá hạn chế của giải pháp", 173, ["assess solution limitations", "solution limitations", "solution component problem", "defect", "problem analysis"], "Xác định vấn đề trong solution hoặc solution components, phân tích nguyên nhân gốc, mức độ nghiêm trọng và impact đối với operations/value."),
  createBabokTopic("task", "Chapter 8: Solution Evaluation", "8.4", "Assess Enterprise Limitations", "Đánh giá hạn chế của doanh nghiệp", 177, ["assess enterprise limitations", "enterprise limitations", "organizational culture limitation", "organizational structure limitation", "interpersonal conflict", "change absorption"], "Xác định culture, structure, processes, policies, skills hoặc stakeholder factors của enterprise đang cản trở solution tạo ra đầy đủ value."),
  createBabokTopic("task", "Chapter 8: Solution Evaluation", "8.5", "Recommend Actions to Increase Solution Value", "Đề xuất hành động tăng giá trị giải pháp", 182, ["recommend actions to increase solution value", "increase solution value", "retire solution", "replace solution", "modify solution", "sunk cost", "opportunity cost", "necessity"], "Đề xuất duy trì, cải tiến, thay thế hoặc loại bỏ solution; cân nhắc cost, benefit, risk, opportunity cost, sunk cost và khả năng enterprise hấp thụ thay đổi."),
  createBabokTopic("competency", "Chapter 9: Underlying Competencies", "9.1", "Analytical Thinking and Problem Solving", "Tư duy phân tích và giải quyết vấn đề", 188, ["analytical thinking", "problem solving", "creative thinking", "decision making competency", "systems thinking"], "Bao gồm tư duy sáng tạo, ra quyết định, học hỏi, giải quyết vấn đề, systems thinking và conceptual thinking để phân tích thông tin và lựa chọn hành động hợp lý."),
  createBabokTopic("competency", "Chapter 9: Underlying Competencies", "9.2", "Behavioural Characteristics", "Đặc điểm hành vi", 194, ["behavioural characteristics", "ethics", "personal accountability", "trustworthiness", "adaptability"], "Tập trung vào ethics, personal accountability, trustworthiness, organization/time management và adaptability để BA tạo niềm tin và hoàn thành cam kết."),
  createBabokTopic("competency", "Chapter 9: Underlying Competencies", "9.3", "Business Knowledge", "Kiến thức kinh doanh", 199, ["business knowledge", "business acumen", "industry knowledge", "organization knowledge", "solution knowledge", "methodology knowledge"], "BA cần hiểu business principles, industry, organization, solution và methodology để giải thích context, đánh giá tác động và giao tiếp chính xác."),
  createBabokTopic("competency", "Chapter 9: Underlying Competencies", "9.4", "Communication Skills", "Kỹ năng giao tiếp", 203, ["communication skills", "verbal communication", "non-verbal communication", "written communication", "listening"], "Giao tiếp hiệu quả đòi hỏi verbal, non-verbal, written communication và active listening phù hợp với audience, purpose và context."),
  createBabokTopic("competency", "Chapter 9: Underlying Competencies", "9.5", "Interaction Skills", "Kỹ năng tương tác", 207, ["interaction skills", "facilitation", "leadership and influencing", "teamwork", "negotiation and conflict resolution", "teaching"], "Bao gồm facilitation, leadership/influencing, teamwork, negotiation/conflict resolution và teaching để đạt shared understanding và agreement."),
  createBabokTopic("competency", "Chapter 9: Underlying Competencies", "9.6", "Tools and Technology", "Công cụ và công nghệ", 211, ["tools and technology", "office productivity tools", "business analysis tools", "communication tools"], "BA lựa chọn và sử dụng tools hỗ trợ productivity, communication, modeling, requirements management và collaboration phù hợp với initiative."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.1", "Acceptance and Evaluation Criteria", "Tiêu chí chấp nhận và đánh giá", 217, ["acceptance and evaluation criteria", "acceptance criteria", "evaluation criteria"], "Xác định các điều kiện dùng để đánh giá một requirement, design, solution hoặc option có được chấp nhận và đáp ứng kỳ vọng hay không."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.2", "Backlog Management", "Quản lý backlog", 220, ["backlog management", "backlog"], "Duy trì danh sách item được ưu tiên và liên tục tinh chỉnh để định hướng công việc, release và việc tạo value theo từng increment."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.3", "Balanced Scorecard", "Thẻ điểm cân bằng", 223, ["balanced scorecard"], "Đo lường performance từ nhiều góc nhìn liên kết với strategy, thường gồm financial, customer, internal process và learning/growth."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.4", "Benchmarking and Market Analysis", "Đối chuẩn và phân tích thị trường", 226, ["benchmarking and market analysis", "benchmarking", "market analysis"], "So sánh performance/capability với tổ chức hoặc thị trường để nhận diện gap, xu hướng, cơ hội và mục tiêu cải thiện."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.5", "Brainstorming", "Động não", 227, ["brainstorming"], "Tạo nhiều ý tưởng nhanh trong môi trường không phán xét trước khi nhóm sàng lọc, kết hợp và đánh giá các ý tưởng."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.6", "Business Capability Analysis", "Phân tích năng lực kinh doanh", 230, ["business capability analysis", "capability analysis"], "Mô tả enterprise làm được gì, đánh giá mức hiện tại/tương lai và xác định capability gaps cần xử lý."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.7", "Business Cases", "Luận chứng kinh doanh", 234, ["business cases", "business case", "cost benefit analysis"], "Trình bày business need, desired outcomes, alternatives, costs, benefits, risks và recommendation để hỗ trợ quyết định đầu tư."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.8", "Business Model Canvas", "Khung mô hình kinh doanh", 236, ["business model canvas"], "Mô tả cách tổ chức tạo, cung cấp và thu nhận value qua chín khối như customer segments, value propositions, channels, resources và revenue/cost."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.9", "Business Rules Analysis", "Phân tích quy tắc kinh doanh", 240, ["business rules analysis", "business rules"], "Khám phá, diễn đạt, kiểm tra và quản lý các quy tắc chi phối quyết định, hành vi và operations của enterprise."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.10", "Collaborative Games", "Trò chơi cộng tác", 243, ["collaborative games", "product box"], "Dùng hoạt động có cấu trúc và tương tác để tăng engagement, khám phá ưu tiên, tạo ý tưởng hoặc xây shared understanding."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.11", "Concept Modelling", "Mô hình hóa khái niệm", 245, ["concept modelling", "concept modeling", "concept model"], "Xác định các khái niệm quan trọng trong domain và quan hệ giữa chúng để tạo ngôn ngữ chung, không tập trung vào thiết kế dữ liệu vật lý."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.12", "Data Dictionary", "Từ điển dữ liệu", 247, ["data dictionary", "data glossary"], "Định nghĩa data elements, meaning, format, allowed values và relationships nhằm bảo đảm cách hiểu và sử dụng dữ liệu nhất quán."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.13", "Data Flow Diagrams", "Sơ đồ luồng dữ liệu", 250, ["data flow diagram", "data flow diagrams", "dfd"], "Mô tả cách dữ liệu đi vào, được xử lý, lưu trữ và đi ra khỏi processes/systems; tập trung vào luồng thông tin thay vì trình tự thời gian."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.14", "Data Mining", "Khai phá dữ liệu", 253, ["data mining"], "Phân tích tập dữ liệu lớn để tìm pattern, correlation, anomaly hoặc insight hỗ trợ hiểu vấn đề và ra quyết định."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.15", "Data Modelling", "Mô hình hóa dữ liệu", 256, ["data modelling", "data modeling", "entity relationship diagram", "erd", "crud matrix", "create read update delete matrix"], "Mô tả entities/data objects, attributes, relationships và rules của dữ liệu ở mức conceptual, logical hoặc physical."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.16", "Decision Analysis", "Phân tích quyết định", 261, ["decision analysis"], "Đánh giá alternatives theo criteria, uncertainty, risk, cost và value để hỗ trợ lựa chọn minh bạch và có căn cứ."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.17", "Decision Modelling", "Mô hình hóa quyết định", 265, ["decision modelling", "decision modeling", "decision table", "decision tree"], "Biểu diễn logic quyết định, inputs, business rules và outcomes để làm rõ, kiểm tra và tự động hóa quyết định."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.18", "Document Analysis", "Phân tích tài liệu", 269, ["document analysis", "historical documents"], "Rà soát tài liệu hiện có để khám phá context, requirements, rules, processes, issues và nguồn thông tin cần xác nhận."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.19", "Estimation", "Ước lượng", 271, ["estimation", "rough order of magnitude", "rom", "delphi estimation", "parametric estimation", "top-down estimation", "rolling wave"], "Ước lượng size, effort, duration hoặc cost bằng phương pháp phù hợp với mức thông tin và độ bất định; kết quả cần nêu assumptions và range."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.20", "Financial Analysis", "Phân tích tài chính", 274, ["financial analysis", "return on investment", "roi", "net present value", "npv", "internal rate of return", "irr", "payback period", "sunk cost", "opportunity cost"], "Đánh giá chi phí và lợi ích theo thời gian bằng ROI, NPV, IRR, payback và các khái niệm như sunk/opportunity cost để so sánh alternatives."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.21", "Focus Groups", "Nhóm tập trung", 279, ["focus groups", "focus group"], "Thu thập quan điểm và phản ứng từ nhóm người đại diện được dẫn dắt bởi moderator; phù hợp khám phá perceptions nhưng không mặc nhiên đại diện toàn bộ population."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.22", "Functional Decomposition", "Phân rã chức năng", 283, ["functional decomposition"], "Chia một chức năng hoặc vấn đề phức tạp thành các phần nhỏ hơn, dễ hiểu, phân tích và quản lý hơn."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.23", "Glossary", "Bảng thuật ngữ", 286, ["glossary"], "Định nghĩa thuật ngữ domain và từ viết tắt để các stakeholder sử dụng ngôn ngữ nhất quán và giảm ambiguity."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.24", "Interface Analysis", "Phân tích giao diện", 287, ["interface analysis", "interface"], "Xác định interactions và data exchanged giữa people, processes, systems hoặc components, cùng constraints và requirements của interface."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.25", "Interviews", "Phỏng vấn", 290, ["interviews", "interview"], "Trao đổi trực tiếp có cấu trúc hoặc bán cấu trúc để khám phá knowledge, needs, assumptions và concerns của từng stakeholder."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.26", "Item Tracking", "Theo dõi hạng mục", 294, ["item tracking", "action items register", "issue log"], "Ghi nhận và theo dõi issues, actions, assumptions, dependencies hoặc decisions với owner, status và due date cho đến khi đóng."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.27", "Lessons Learned", "Bài học kinh nghiệm", 296, ["lessons learned", "retrospective"], "Xác định điều hiệu quả/chưa hiệu quả và hành động cải tiến để áp dụng trong initiative hiện tại hoặc tương lai."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.28", "Metrics and Key Performance Indicators (KPIs)", "Thước đo và chỉ số hiệu suất chính", 297, ["metrics and key performance indicators", "key performance indicators", "kpis", "performance measures"], "Định nghĩa quantitative/qualitative measures gắn với objectives, cách thu thập, target và cách diễn giải để đánh giá performance/value."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.29", "Mind Mapping", "Sơ đồ tư duy", 299, ["mind mapping", "mind map"], "Tổ chức ý tưởng theo cấu trúc phân nhánh trực quan để khám phá quan hệ, phạm vi và chủ đề trong brainstorming hoặc analysis."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.30", "Non-Functional Requirements Analysis", "Phân tích yêu cầu phi chức năng", 302, ["non-functional requirements analysis", "non-functional requirements", "quality of service requirements", "reliability availability scalability compatibility localization"], "Xác định quality attributes và conditions như performance, security, reliability, availability, usability, scalability, compatibility và localization."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.31", "Observation", "Quan sát", 305, ["observation", "job shadowing"], "Quan sát stakeholder thực hiện công việc trong context thực tế để phát hiện hành vi, exception và tacit knowledge khó mô tả bằng lời."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.32", "Organizational Modelling", "Mô hình hóa tổ chức", 308, ["organizational modelling", "organizational modeling", "organization chart"], "Mô tả units, roles, reporting lines, responsibilities và relationships để hiểu cấu trúc và tác động của change."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.33", "Prioritization", "Ưu tiên hóa", 311, ["prioritization", "moscow", "weighted scoring", "ranking requirements"], "Xác định thứ tự tương đối của items dựa trên criteria như value, urgency, risk, dependency, cost và compliance; ưu tiên cần được xem xét lại khi context thay đổi."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.34", "Process Analysis", "Phân tích quy trình", 314, ["process analysis", "process improvement"], "Đánh giá process hiện tại để tìm value, waste, bottleneck, root cause và cơ hội cải thiện trước khi thiết kế future process."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.35", "Process Modelling", "Mô hình hóa quy trình", 318, ["process modelling", "process modeling", "process map", "activity flow", "activity diagram", "draw a diagram of the process", "bpmn"], "Biểu diễn activities, events, decisions, roles và flow của process để hiểu current/future state và trao đổi requirements."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.36", "Prototyping", "Tạo mẫu", 323, ["prototyping", "prototype", "proof of concept"], "Tạo representation sớm của solution hoặc component để khám phá/kiểm tra requirements, usability, feasibility và stakeholder expectations."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.37", "Reviews", "Rà soát", 326, ["reviews", "walkthrough", "peer review"], "Đánh giá work product bởi một hoặc nhiều người để tìm defect, inconsistency, omission và xác nhận quality hoặc agreement."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.38", "Risk Analysis and Management", "Phân tích và quản lý rủi ro", 329, ["risk analysis and management", "risk analysis", "risk management", "risk register"], "Xác định, phân tích, ưu tiên và response với uncertainty ảnh hưởng value; theo dõi risk và điều chỉnh response theo context."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.39", "Roles and Permissions Matrix", "Ma trận vai trò và quyền hạn", 333, ["roles and permissions matrix", "roles and permissions", "raci matrix"], "Ánh xạ roles với activities, data hoặc permissions để làm rõ responsibility, authority và access."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.40", "Root Cause Analysis", "Phân tích nguyên nhân gốc rễ", 335, ["root cause analysis", "five whys", "fishbone diagram", "problem analysis"], "Tìm nguyên nhân nền tảng tạo ra problem thay vì chỉ xử lý symptom, thường dùng Five Whys, fishbone hoặc causal analysis."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.41", "Scope Modelling", "Mô hình hóa phạm vi", 338, ["scope modelling", "scope modeling", "context diagram", "scope model"], "Xác định boundary, elements trong/ngoài scope và interfaces với external actors/systems để kiểm soát phạm vi."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.42", "Sequence Diagrams", "Sơ đồ tuần tự", 341, ["sequence diagram", "sequence diagrams"], "Mô tả interaction theo thời gian giữa actors/objects và messages được truyền trong một scenario."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.43", "Stakeholder List, Map, or Personas", "Danh sách, bản đồ hoặc chân dung bên liên quan", 344, ["stakeholder list map or personas", "stakeholder list", "stakeholder map", "personas", "power interest grid"], "Xác định stakeholder và phân tích đặc điểm, influence, impact, interest, attitude hoặc nhu cầu thông qua list, map hay personas."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.44", "State Modelling", "Mô hình hóa trạng thái", 348, ["state modelling", "state modeling", "state diagram"], "Mô tả các state của entity/system và events/conditions gây transition giữa các state."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.45", "Survey or Questionnaire", "Khảo sát hoặc bảng hỏi", 350, ["survey or questionnaire", "survey", "questionnaire"], "Thu thập dữ liệu chuẩn hóa từ nhiều người; cần thiết kế câu hỏi, sample và cách phân tích để tránh bias và tạo baseline tin cậy."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.46", "SWOT Analysis", "Phân tích SWOT", 353, ["swot analysis", "strengths weaknesses opportunities threats"], "Đánh giá strengths/weaknesses nội bộ và opportunities/threats bên ngoài để hiểu strategic context và lựa chọn hướng thay đổi."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.47", "Use Cases and Scenarios", "Ca sử dụng và kịch bản", 356, ["use cases and scenarios", "use case", "use case diagram", "actor", "extension", "association"], "Mô tả mục tiêu và interaction giữa actor với solution qua main/alternate/exception flows; diagram thể hiện actors, use cases và relationships."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.48", "User Stories", "Câu chuyện người dùng", 359, ["user stories", "user story", "brief statement about what people do or need", "story that allows the developer"], "Mô tả nhu cầu ngắn gọn từ góc nhìn stakeholder cùng acceptance criteria; được làm rõ và ưu tiên trong backlog."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.49", "Vendor Assessment", "Đánh giá nhà cung cấp", 361, ["vendor assessment", "supplier assessment", "vendor"], "Đánh giá vendor và offering theo capability, fit, cost, risk, support, contract và khả năng đáp ứng requirements."),
  createBabokTopic("technique", "Chapter 10: Techniques", "10.50", "Workshops", "Hội thảo", 363, ["workshops", "facilitated workshop", "requirements workshop"], "Tập hợp stakeholder trong phiên có facilitator, mục tiêu và agenda rõ để nhanh chóng elicitate, analyze, prioritize hoặc đạt agreement."),
  createBabokTopic("perspective", "Chapter 11: Perspectives", "11.1", "The Agile Perspective", "Góc nhìn Agile", 368, ["agile perspective", "agile", "iterative", "incremental"], "Điều chỉnh BA work cho delivery lặp và tăng dần, ưu tiên collaboration, backlog, feedback nhanh, vừa đủ tài liệu và value theo increment."),
  createBabokTopic("perspective", "Chapter 11: Perspectives", "11.2", "The Business Intelligence Perspective", "Góc nhìn Business Intelligence", 381, ["business intelligence perspective", "business intelligence", "bi perspective"], "Tập trung biến data thành information/insight, bao gồm data quality, analytics, decision support và governance."),
  createBabokTopic("perspective", "Chapter 11: Perspectives", "11.3", "The Information Technology Perspective", "Góc nhìn Công nghệ thông tin", 394, ["information technology perspective", "information technology", "it perspective", "cots system"], "Áp dụng BA trong thay đổi technology, systems và software; chú trọng interfaces, non-functional requirements, architecture, testing và implementation."),
  createBabokTopic("perspective", "Chapter 11: Perspectives", "11.4", "The Business Architecture Perspective", "Góc nhìn Kiến trúc kinh doanh", 408, ["business architecture perspective", "business architecture", "capability map", "value stream"], "Xem enterprise ở mức chiến lược thông qua capabilities, value streams, information và organization để liên kết strategy với change initiatives."),
  createBabokTopic("perspective", "Chapter 11: Perspectives", "11.5", "The Business Process Management Perspective", "Góc nhìn Quản lý quy trình kinh doanh", 424, ["business process management perspective", "business process management", "bpm perspective", "process re-engineering"], "Tập trung khám phá, phân tích, thiết kế, đo lường và cải tiến end-to-end business processes để tăng hiệu quả và value."),
];

const BABOK_CHAPTER_FALLBACKS: Record<string, string> = {
  '3': 'Chapter 3',
  '4': 'Chapter 4',
  '5': 'Chapter 5',
  '6': 'Chapter 6',
  '7': 'Chapter 7',
  '8': 'Chapter 8',
};

function normalizeBabokMatchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectSourceChapter(sourceTitle: string): string | null {
  const source = normalizeBabokMatchText(sourceTitle);
  const rules: Array<[string, string[]]> = [
    ['3', ['ka 3', 'business analysis planning and monitoring']],
    ['4', ['ka 4', 'elicitation and collaboration']],
    ['5', ['ka 5', 'requirements life cycle management']],
    ['6', ['ka 6', 'strategy analysis']],
    ['7', ['ka 7', 'requirements analysis and design definition']],
    ['8', ['ka 8', 'solution evaluation']],
  ];

  return (
    rules.find(([, aliases]) =>
      aliases.some((alias) => source.includes(normalizeBabokMatchText(alias)))
    )?.[0] || null
  );
}

const BABOK_GENERIC_ALIASES = new Set([
  'stakeholder',
  'stakeholders',
  'enterprise',
  'organization',
  'plan',
  'risk',
  'requirements',
  'designs',
  'requirements and designs',
  'solution',
  'interface',
  'model',
]);

const BABOK_ROUTING_HINTS: Array<{
  section: string;
  patterns: RegExp[];
  score: number;
}> = [
  { section: 'Chapter 1', patterns: [/what does.*babok.*contain/i, /according to.*babok.*what is business analysis/i, /purpose of the babok guide/i, /structure of the babok guide/i], score: 135 },
  { section: '2.1', patterns: [/\bbaccm\b/i, /business analysis core concept model/i, /change.*need.*solution.*stakeholder.*value.*context/i], score: 135 },
  { section: '2.3', patterns: [/type of requirement/i, /requirements classification/i, /transition requirement/i, /functional requirement/i, /non-functional requirement/i], score: 135 },
  { section: '2.4', patterns: [/type of stakeholder/i, /stakeholder role/i, /domain subject matter expert/i, /implementation subject matter expert/i, /operational support/i, /\bregulator\b/i, /\bsponsor\b/i, /\bsupplier\b/i, /\btester\b/i], score: 125 },
  { section: '2.5', patterns: [/difference between requirements and designs/i, /requirements.*focused on.*need/i, /designs.*focused on.*solution/i], score: 140 },
  { section: '3.1', patterns: [/\badaptive\b/i, /\bpredictive\b/i, /\bwaterfall\b/i, /formal requirements documentation/i], score: 120 },
  { section: '3.2', patterns: [/stakeholder analysis/i, /stakeholder attitudes/i, /roles and responsibilities/i], score: 105 },
  { section: '3.3', patterns: [/governance approach/i, /change control process/i, /authority to approve/i, /decision making/i, /decisions about requirements and designs/i, /stakeholder approval approach/i], score: 110 },
  { section: '3.4', patterns: [/information management approach/i, /requirements reuse/i, /repository/i, /long-term use/i], score: 105 },
  { section: '3.5', patterns: [/business analysis performance/i, /corrective action/i, /preventive action/i, /performance improvement/i, /monitoring and controlling.*business analysis work/i, /organizational performance standards/i], score: 110 },
  { section: '4.1', patterns: [/prepare for elicitation/i, /elicitation objectives/i, /supporting materials/i, /resources.*organized.*scheduled/i], score: 110 },
  { section: '4.2', patterns: [/conduct elicitation/i, /collaborative.*research.*experiment/i, /type of elicitation/i, /elicitation session/i], score: 110 },
  { section: '4.3', patterns: [/confirm elicitation/i, /accurate and consistent with other information/i], score: 110 },
  { section: '4.4', patterns: [/communicat.*business analysis information/i, /information package/i, /format to present/i, /formal and informal documentation/i], score: 110 },
  { section: '4.5', patterns: [/manage stakeholder collaboration/i, /stakeholder collaboration/i, /stakeholder participation/i], score: 110 },
  { section: '5.1', patterns: [/traceability/i, /trace requirements/i, /relationships.*requirements/i, /missing functionality/i], score: 115 },
  { section: '5.2', patterns: [/maintain requirements/i, /maintaining requirements/i, /requirements re-use/i, /requirements reuse/i, /requirements attributes/i], score: 110 },
  { section: '5.3', patterns: [/priorit/i, /priority of.*requirements/i, /rank requirements/i], score: 115 },
  { section: '5.4', patterns: [/assess requirement.*change/i, /requirements require a change/i, /areas of impact/i, /impact analysis.*change/i, /proposed change/i, /change assessment/i], score: 115 },
  { section: '5.5', patterns: [/approv.*requirements/i, /gaining approval/i, /sign-off/i], score: 115 },
  { section: '6.1', patterns: [/current state/i, /business need/i, /internal assets/i, /current capabilities/i], score: 105 },
  { section: '6.2', patterns: [/future state/i, /business objectives/i, /desired outcomes/i, /potential value/i], score: 105 },
  { section: '6.3', patterns: [/assess risks/i, /risk tolerance/i, /uncertainty.*value/i], score: 110 },
  { section: '6.4', patterns: [/change strategy/i, /gap analysis/i, /transition state/i, /solution scope/i], score: 110 },
  { section: '7.1', patterns: [/specify and model/i, /requirements formats/i, /text.*matrices.*diagrams/i, /metadata/i], score: 110 },
  { section: '7.2', patterns: [/\batomic\b/i, /quality characteristic/i, /verify requirements/i, /unambiguous/i, /testable/i], score: 125 },
  { section: '7.3', patterns: [/validate requirements/i, /validating requirements/i, /right requirements/i, /missing requirements/i, /validation criteria/i], score: 120 },
  { section: '7.4', patterns: [/requirements architecture/i, /template architectures/i, /collectively support one another/i, /work in harmony/i, /single whole/i, /fit.*together.*meaningful whole/i, /cohesive whole/i, /organize requirements based on.*solution components/i], score: 160 },
  { section: '7.5', patterns: [/design options/i, /requirements allocation/i, /solution approach/i], score: 110 },
  { section: '7.6', patterns: [/recommend solution/i, /potential value.*solution/i, /trade-offs/i], score: 110 },
  { section: '8.1', patterns: [/measure solution performance/i, /performance measures/i, /measurement.*volume/i, /measurement.*frequency/i, /measurement.*timing/i], score: 115 },
  { section: '8.2', patterns: [/analyz.*performance measure/i, /performance trend/i, /\ba trend\b/i, /repeatable and reproducible/i], score: 115 },
  { section: '8.3', patterns: [/solution limitation/i, /solution component.*problem/i, /ineffective outputs/i, /source of the problem/i], score: 115 },
  { section: '8.4', patterns: [/enterprise limitation/i, /cultural assessment/i, /interpersonal conflict/i, /organizational structure/i], score: 115 },
  { section: '8.5', patterns: [/increase solution value/i, /retire the solution/i, /replace the solution/i, /sunk cost/i, /necessity/i], score: 115 },
  { section: '10.15', patterns: [/crud.*matrix/i, /create.*read.*update.*delete/i, /entity relationship diagram/i], score: 120 },
  { section: '10.30', patterns: [/non-functional requirement/i, /reliability.*compatibility.*scalability/i, /quality of service requirement/i], score: 130 },
  { section: '10.35', patterns: [/activity diagram/i, /process diagram/i, /draw a diagram of the process/i, /bpmn/i], score: 120 },
  { section: '10.47', patterns: [/use case diagram/i, /actor.*use case/i, /association.*extension/i], score: 120 },
  { section: '10.48', patterns: [/user stor/i, /brief statement.*people.*need/i], score: 120 },
];

function topicChapterNumber(topic: BabokTopic): string | null {
  const sectionMatch = topic.section.match(/^(?:Chapter\s+)?([0-9]+)/i);
  return sectionMatch?.[1] || null;
}

function aliasMatchScore(
  text: string,
  alias: string,
  baseScore: number
): number {
  const normalizedAlias = normalizeBabokMatchText(alias);
  if (normalizedAlias.length < 3 || !text.includes(normalizedAlias)) return 0;

  const adjustedBase = BABOK_GENERIC_ALIASES.has(normalizedAlias)
    ? Math.min(baseScore, 22)
    : baseScore;

  return adjustedBase + Math.min(45, normalizedAlias.length);
}

function scoreBabokTopic(
  topic: BabokTopic,
  questionText: string,
  correctAnswerText: string,
  sourceChapter: string | null
): number {
  const question = normalizeBabokMatchText(questionText);
  const answer = normalizeBabokMatchText(correctAnswerText);
  const combinedOriginal = `${questionText} ${correctAnswerText}`;
  const asksForTask =
    /\bwhich\b.{0,45}\btask\b|\bwhat\b.{0,35}\btask\b|\bduring which task\b|\btask is\b|\bknowledge area\b/i.test(
      questionText
    );
  const asksForTechnique =
    /\bwhich\b.{0,45}\btechnique\b|\bwhat\b.{0,35}\btechnique\b|\bbest suited\b|\bmost suitable\b|\bdiagram\b|\bmatrix\b/i.test(
      questionText
    );
  let score = 0;

  topic.aliases.forEach((alias) => {
    const questionBase =
      topic.kind === 'task'
        ? 175
        : topic.kind === 'technique'
        ? asksForTask
          ? 72
          : 135
        : 105;
    const answerBase =
      asksForTask && topic.kind === 'task'
        ? 180
        : asksForTechnique && topic.kind === 'technique'
        ? 155
        : topic.kind === 'task'
        ? 105
        : 82;

    score = Math.max(score, aliasMatchScore(question, alias, questionBase));
    score = Math.max(score, aliasMatchScore(answer, alias, answerBase));
  });

  BABOK_ROUTING_HINTS.forEach((hint) => {
    if (
      hint.section === topic.section &&
      hint.patterns.some((pattern) => pattern.test(combinedOriginal))
    ) {
      score = Math.max(score, hint.score + 45);
    }
  });

  if (sourceChapter && topicChapterNumber(topic) === sourceChapter) {
    score += topic.kind === 'task' ? 55 : topic.kind === 'chapter' ? 42 : 12;
  }

  if (asksForTechnique && topic.kind === 'technique' && score > 0) score += 12;
  if (asksForTask && topic.kind === 'task' && score > 0) score += 14;

  return score;
}

function inferBabokFocus(questionText: string, topic: BabokTopic): BabokFocus {
  const question = normalizeBabokMatchText(questionText);

  if (topic.kind === 'task') {
    const taskFocusRules: Array<{
      pattern: RegExp;
      suffix: string;
      name: string;
      guide: string;
    }> = [
      {
        pattern: /\bpurpose\b|\bprimary goal\b|\bgoal of\b|\bwhy\b/,
        suffix: '.1 Purpose',
        name: 'Mục đích của task',
        guide:
          'Purpose giải thích lý do thực hiện task và value được tạo ra. Không nhầm Purpose với Description, vốn giải thích task được thực hiện như thế nào và nhằm đạt điều gì.',
      },
      {
        pattern: /\bdescription\b|\bdescribes\b|\bwhat does\b/,
        suffix: '.2 Description',
        name: 'Mô tả của task',
        guide:
          'Description làm rõ task là gì, tại sao thực hiện và kết quả tổng quát cần đạt. Đọc cùng Purpose để nhận ra câu hỏi đang hỏi “vì sao” hay “làm gì”.',
      },
      {
        pattern: /\binput\b|\binputs\b|\bprerequisite\b|\brequired before\b/,
        suffix: '.3 Inputs',
        name: 'Đầu vào của task',
        guide:
          'Inputs là thông tin được tiêu thụ hoặc chuyển đổi để task bắt đầu. Hãy phân biệt input với Guidelines and Tools và với output của chính task.',
      },
      {
        pattern: /\belement\b|\belements\b|\bkey concept\b|\bconsideration\b|\bcharacteristic\b/,
        suffix: '.4 Elements',
        name: 'Các yếu tố cần hiểu',
        guide:
          'Elements là các khái niệm quan trọng để hiểu cách thực hiện task; chúng không mặc nhiên là deliverables bắt buộc và có thể được tailoring theo approach.',
      },
      {
        pattern: /\bguideline\b|\bguidelines\b|\btool\b|\btools\b|\bartifact\b|\breference\b/,
        suffix: '.5 Guidelines and Tools',
        name: 'Guidelines and Tools',
        guide:
          'Guidelines and Tools là nguồn lực/hướng dẫn giúp biến inputs thành outputs. Chúng có thể là output của task khác nhưng không phải output của task đang xét.',
      },
      {
        pattern: /\btechnique\b|\btechniques\b|\bbest suited\b|\bused during\b/,
        suffix: '.6 Techniques',
        name: 'Các kỹ thuật áp dụng',
        guide:
          'Techniques là các cách có thể dùng để thực hiện task. Một technique có thể hỗ trợ nhiều task; cần đối chiếu đúng task-to-technique mapping thay vì chỉ nhớ tên technique.',
      },
      {
        pattern: /\bstakeholder\b|\bstakeholders\b|\bwho\b|\bparticipate\b|\bresponsible\b/,
        suffix: '.7 Stakeholders',
        name: 'Stakeholder tham gia hoặc bị ảnh hưởng',
        guide:
          'Danh sách Stakeholders của task nêu các vai trò thường tham gia hoặc bị ảnh hưởng, không bắt buộc mọi vai trò phải xuất hiện trong mọi initiative.',
      },
      {
        pattern: /\boutput\b|\boutputs\b|\bdeliverable\b|\bresult\b|\bproduces\b/,
        suffix: '.8 Outputs',
        name: 'Đầu ra của task',
        guide:
          'Output là business analysis information được tạo mới, biến đổi hoặc thay đổi trạng thái sau khi task hoàn tất; một output có thể là một phần của deliverable lớn hơn.',
      },
    ];

    const matched = taskFocusRules.find((rule) => rule.pattern.test(question));
    if (matched) {
      return {
        sectionLabel: `${topic.section}${matched.suffix}`,
        focusName: matched.name,
        readingGuide: matched.guide,
      };
    }

    return {
      sectionLabel: topic.section,
      focusName: 'Tổng quan task và luồng Input - Task - Output',
      readingGuide:
        'Đọc lần lượt Purpose, Description, Inputs, Elements, Guidelines and Tools, Techniques, Stakeholders và Outputs; đây là cấu trúc chuẩn của mỗi task trong BABOK.',
    };
  }

  if (topic.kind === 'technique') {
    if (/\badvantage\b|\bdisadvantage\b|\blimitation\b|\bconsideration\b|\bmore effective\b|\bless effective\b/.test(question)) {
      return {
        sectionLabel: `${topic.section}.4 Usage Considerations`,
        focusName: 'Điều kiện và lưu ý khi sử dụng technique',
        readingGuide:
          'Usage Considerations giúp phân biệt khi technique phù hợp, hạn chế, chi phí hoặc rủi ro của nó. Đây thường là phần tạo các lựa chọn gây nhiễu trong câu thi.',
      };
    }

    if (/\belement\b|\belements\b|\bcomponent\b|\bcharacteristic\b/.test(question)) {
      return {
        sectionLabel: `${topic.section}.3 Elements`,
        focusName: 'Các thành phần của technique',
        readingGuide:
          'Elements mô tả các bước hoặc thành phần cốt lõi để áp dụng technique. Hãy nhớ logic và mục đích của từng thành phần thay vì chỉ học thuộc tên.',
      };
    }

    if (/\bpurpose\b|\bused for\b|\bbest suited\b|\bmost suitable\b/.test(question)) {
      return {
        sectionLabel: `${topic.section}.1 Purpose`,
        focusName: 'Mục đích và trường hợp sử dụng',
        readingGuide:
          'Purpose cho biết technique được dùng để đạt điều gì và trong hoàn cảnh nào. So sánh mục tiêu của technique này với các technique gần giống.',
      };
    }

    return {
      sectionLabel: `${topic.section}.2 Description`,
      focusName: 'Khái niệm và cách technique hoạt động',
      readingGuide:
        'Đọc Description để hiểu technique biểu diễn hoặc xử lý loại thông tin nào, đầu vào quan sát được và loại kết quả mà technique tạo ra.',
    };
  }

  return {
    sectionLabel: topic.section,
    focusName: 'Khái niệm cốt lõi và cách áp dụng',
    readingGuide:
      'Đọc phần định nghĩa, mối quan hệ với các khái niệm khác và ví dụ áp dụng. Với câu tình huống, hãy xác định từ khóa mô tả đúng bản chất chứ không chỉ dựa vào chức danh hoặc công cụ.',
  };
}

function getFocusEnglishLabel(focus: BabokFocus): string {
  const section = focus.sectionLabel;

  if (/\.1\b/.test(section)) return 'Purpose';
  if (/\.2\b/.test(section)) return 'Description';
  if (/\.3\b/.test(section)) return 'Inputs';
  if (/\.4\b/.test(section)) {
    return /10\./.test(section) ? 'Usage Considerations' : 'Elements';
  }
  if (/\.5\b/.test(section)) return 'Guidelines and Tools';
  if (/\.6\b/.test(section)) return 'Techniques';
  if (/\.7\b/.test(section)) return 'Stakeholders';
  if (/\.8\b/.test(section)) return 'Outputs';

  return 'Core concept and application';
}

function identifyQuestionIntent(
  questionText: string,
  topic: BabokTopic,
  focus: BabokFocus
): BilingualStudyItem {
  const normalized = normalizeBabokMatchText(questionText);
  const negative = /\bnot\b|\bleast\b|\bexcept\b|\bfalse\b|\bincorrect\b/.test(
    normalized
  );

  if (negative) {
    return {
      en: 'Negative / exception question: identify the option that does NOT belong.',
      vi: 'Câu hỏi phủ định hoặc loại trừ: phải tìm phương án KHÔNG thuộc, ÍT phù hợp nhất hoặc là ngoại lệ.',
    };
  }

  if (/\binput\b|\binputs\b|\bprerequisite\b|required before/.test(normalized)) {
    return {
      en: `Identify the input required before ${topic.titleEn} can begin.`,
      vi: `Xác định đầu vào cần có trước khi thực hiện ${topic.titleVi}.`,
    };
  }

  if (/\boutput\b|\boutputs\b|\bdeliverable\b|\bproduces\b|\bresult\b/.test(normalized)) {
    return {
      en: `Identify the output produced by ${topic.titleEn}.`,
      vi: `Xác định đầu ra được tạo ra sau khi thực hiện ${topic.titleVi}.`,
    };
  }

  if (/\btechnique\b|best suited|most suitable|which diagram|which matrix/.test(normalized)) {
    return {
      en: 'Match the scenario goal to the purpose of the most suitable technique.',
      vi: 'Ghép mục tiêu của tình huống với mục đích của kỹ thuật phù hợp nhất.',
    };
  }

  if (/\bstakeholder\b|\bstakeholders\b|\bwho\b|participate|responsible/.test(normalized)) {
    return {
      en: `Identify the stakeholder role associated with ${topic.titleEn}.`,
      vi: `Xác định vai trò bên liên quan thường tham gia, chịu trách nhiệm hoặc bị ảnh hưởng trong ${topic.titleVi}.`,
    };
  }

  if (/which task|what task|task is|knowledge area|during which task/.test(normalized)) {
    return {
      en: 'Recognize the BABOK task from its purpose, activity, input, or output.',
      vi: 'Nhận diện đúng task BABOK từ mục đích, hoạt động, đầu vào hoặc đầu ra được mô tả trong đề.',
    };
  }

  if (/purpose|primary goal|goal of|why/.test(normalized)) {
    return {
      en: `Understand the purpose and value of ${topic.titleEn}.`,
      vi: `Hiểu mục đích và giá trị mà ${topic.titleVi} tạo ra.`,
    };
  }

  return {
    en: `Apply the ${getFocusEnglishLabel(focus)} of ${topic.titleEn} to the scenario.`,
    vi: `Áp dụng phần ${focus.focusName.toLowerCase()} của ${topic.titleVi} vào tình huống trong đề.`,
  };
}

function buildMemoryRule(
  topic: BabokTopic,
  focus: BabokFocus,
  questionText: string
): BilingualStudyItem {
  const normalized = normalizeBabokMatchText(questionText);

  if (/\bnot\b|\bleast\b|\bexcept\b|\bfalse\b|\bincorrect\b/.test(normalized)) {
    return {
      en: 'Mark the negative word first, validate every option, then choose the exception.',
      vi: 'Khoanh từ phủ định trước, kiểm tra lần lượt từng phương án, rồi chọn phương án ngoại lệ; không chọn ngay phương án nghe quen nhất.',
    };
  }

  if (topic.kind === 'task') {
    return {
      en: `Read the stem as Purpose → Inputs → Elements → Outputs for ${topic.titleEn}.`,
      vi: `Đọc đề theo chuỗi Mục đích → Đầu vào → Thành phần → Đầu ra của ${topic.titleVi}; xác định đề đang hỏi đúng mắt xích nào.`,
    };
  }

  if (topic.kind === 'technique') {
    return {
      en: `Match “what needs to be achieved” with the Purpose and Usage Considerations of ${topic.titleEn}.`,
      vi: `Ghép “cần đạt được điều gì” với Purpose và Usage Considerations của ${topic.titleVi}; đừng chỉ chọn vì tên kỹ thuật xuất hiện quen thuộc.`,
    };
  }

  if (topic.kind === 'concept') {
    return {
      en: `Separate the definition of ${topic.titleEn} from nearby BABOK concepts.`,
      vi: `Tách định nghĩa của ${topic.titleVi} khỏi các khái niệm BABOK gần giống; chú ý ranh giới và từ khóa định nghĩa.`,
    };
  }

  return {
    en: `Use the definition and the ${getFocusEnglishLabel(focus)} in BABOK, not general project-management intuition.`,
    vi: `Dựa vào định nghĩa và ${focus.focusName.toLowerCase()} trong BABOK, không suy luận theo kinh nghiệm quản lý dự án chung.`,
  };
}

function scoreOptionAgainstTopic(topic: BabokTopic, optionText: string): number {
  const option = normalizeBabokMatchText(optionText);
  let score = 0;

  topic.aliases.forEach((alias) => {
    score = Math.max(score, aliasMatchScore(option, alias, 115));
  });

  BABOK_ROUTING_HINTS.forEach((hint) => {
    if (
      hint.section === topic.section &&
      hint.patterns.some((pattern) => pattern.test(optionText))
    ) {
      score = Math.max(score, hint.score);
    }
  });

  return score;
}

function findBestTopicForOption(optionText: string): BabokTopic | undefined {
  const ranked = BABOK_TOPICS.map((topic) => ({
    topic,
    score: scoreOptionAgainstTopic(topic, optionText),
  })).sort((left, right) => right.score - left.score);

  return ranked[0]?.score >= 70 ? ranked[0].topic : undefined;
}

function buildOptionReasons(
  question: Question,
  primary: BabokTopic,
  focus: BabokFocus
): BabokOptionReason[] {
  const negative = /\bnot\b|\bleast\b|\bexcept\b|\bfalse\b|\bincorrect\b/i.test(
    question.text
  );

  return question.options.map((option, optionIndex) => {
    const relatedTopic = findBestTopicForOption(option.text);
    let explanationVi = '';

    if (option.isCorrect) {
      explanationVi = negative
        ? `Đây là phương án phải chọn vì đề đang hỏi theo dạng phủ định/ngoại lệ. Khi đối chiếu ${focus.sectionLabel}, nội dung này là phương án không thuộc hoặc không phù hợp với ${focus.focusName.toLowerCase()} của ${primary.titleVi}.`
        : `Đây là phương án phải chọn vì nội dung của nó khớp trực tiếp với ${focus.focusName.toLowerCase()} tại ${focus.sectionLabel} của ${primary.titleVi}.`;
    } else if (negative) {
      explanationVi = `Phương án này bị loại vì nó vẫn phù hợp với nội dung BABOK đang xét. Trong câu hỏi NOT/EXCEPT, các phương án đúng về kiến thức không phải là đáp án cần khoanh.`;
    } else if (relatedTopic && relatedTopic.id !== primary.id) {
      explanationVi = `Đây là thuật ngữ BABOK có thể đúng trong ngữ cảnh khác, gần với ${relatedTopic.section} ${relatedTopic.titleVi}, nhưng không trả lời đúng ${focus.focusName.toLowerCase()} của ${primary.titleVi} mà đề đang hỏi.`;
    } else {
      explanationVi = `Phương án này có từ khóa liên quan nhưng không khớp đúng vai trò, loại thông tin hoặc mục tiêu được quy định tại ${focus.sectionLabel}. Đây là phương án gây nhiễu “đúng chủ đề nhưng sai điểm hỏi”.`;
    }

    return {
      label: ANSWER_LABELS[optionIndex] || option.originalLabel,
      optionId: option.id,
      optionText: option.text,
      isCorrect: option.isCorrect,
      relatedTopic,
      explanationVi,
    };
  });
}

function buildBabokStudyGuide(question: Question): BabokStudyGuide {
  const correctAnswer = question.options.find((option) => option.isCorrect);
  const correctAnswerText = correctAnswer?.text || '';
  const sourceChapter = detectSourceChapter(question.sourceTitle);

  const ranked = BABOK_TOPICS.map((topic) => ({
    topic,
    score: scoreBabokTopic(
      topic,
      question.text,
      correctAnswerText,
      sourceChapter
    ),
  })).sort((left, right) => right.score - left.score);

  let primary = ranked[0]?.topic;
  const shouldUseChapterFallback =
    !primary || ranked[0].score <= 0 || Boolean(sourceChapter && ranked[0].score <= 70);

  if (shouldUseChapterFallback) {
    const fallbackChapter = sourceChapter
      ? BABOK_CHAPTER_FALLBACKS[sourceChapter]
      : 'Chapter 2';
    primary =
      BABOK_TOPICS.find((topic) => topic.section === fallbackChapter) ||
      BABOK_TOPICS.find((topic) => topic.section === 'Chapter 2') ||
      BABOK_TOPICS[0];
  }

  const related = ranked
    .filter(
      (item) =>
        item.score >= 70 &&
        item.topic.id !== primary.id &&
        item.topic.chapter !== primary.chapter
    )
    .slice(0, 2)
    .map((item) => item.topic);

  const focus = inferBabokFocus(question.text, primary);
  const isNegativeQuestion = /\bnot\b|\bleast\b|\bexcept\b|\bfalse\b|\bincorrect\b/i.test(
    question.text
  );

  const answerTakeaway = isNegativeQuestion
    ? `Đây là câu hỏi loại trừ. Lựa chọn cần xác định là “${correctAnswerText}”. Hãy kiểm tra từng phương án với ${focus.sectionLabel}, đặc biệt xem phương án nào không thuộc hoặc không phù hợp với nội dung BABOK đang hỏi.`
    : `Điểm chốt cần nhớ là “${correctAnswerText}”. Khi gặp câu tương tự, hãy xác định trước câu hỏi đang kiểm tra ${focus.focusName.toLowerCase()}, rồi đối chiếu với ${focus.sectionLabel} thay vì chọn theo từ khóa quen mắt.`;

  const questionIntent = identifyQuestionIntent(question.text, primary, focus);
  const memoryRule = buildMemoryRule(primary, focus, question.text);
  const optionReasons = buildOptionReasons(question, primary, focus);

  return {
    primary,
    related,
    focus,
    answerTakeaway,
    questionIntent,
    memoryRule,
    optionReasons,
  };
}

function babokPdfPage(bookPage: number): number {
  return bookPage + BABOK_PDF_PAGE_OFFSET;
}

function babokPdfPublicUrl(): string {
  return encodeURI(publicFilePath(BABOK_PDF_PUBLIC_FILE));
}

function babokPdfHref(bookPage: number): string {
  return `${babokPdfPublicUrl()}#page=${babokPdfPage(bookPage)}`;
}

function getBabokBookPageRange(topic: BabokTopic): { start: number; end: number } {
  const nextTopic = BABOK_TOPICS
    .filter(
      (candidate) =>
        candidate.kind === topic.kind &&
        candidate.chapter === topic.chapter &&
        candidate.bookPage > topic.bookPage
    )
    .sort((left, right) => left.bookPage - right.bookPage)[0];

  const defaultLength = topic.kind === 'technique' ? 2 : topic.kind === 'task' ? 5 : 2;
  const end = nextTopic
    ? Math.max(topic.bookPage, nextTopic.bookPage - 1)
    : topic.bookPage + defaultLength;

  return { start: topic.bookPage, end };
}

function getFocusKeyword(focus: BabokFocus): BilingualStudyItem {
  const en = getFocusEnglishLabel(focus);
  const viMap: Record<string, string> = {
    Purpose: 'Mục đích',
    Description: 'Mô tả',
    Inputs: 'Đầu vào',
    Elements: 'Các thành phần/yếu tố',
    'Guidelines and Tools': 'Hướng dẫn và công cụ',
    Techniques: 'Các kỹ thuật',
    Stakeholders: 'Các bên liên quan',
    Outputs: 'Đầu ra',
    'Usage Considerations': 'Lưu ý khi sử dụng',
    'Core concept and application': 'Khái niệm cốt lõi và cách áp dụng',
  };

  return { en, vi: viMap[en] || focus.focusName };
}

function getTopicKindKeyword(topic: BabokTopic): BilingualStudyItem {
  const labels: Record<BabokTopicKind, BilingualStudyItem> = {
    chapter: { en: 'Knowledge area / chapter', vi: 'Vùng kiến thức / chương' },
    concept: { en: 'Core concept', vi: 'Khái niệm cốt lõi' },
    task: { en: 'Business analysis task', vi: 'Nhiệm vụ phân tích nghiệp vụ' },
    competency: { en: 'Underlying competency', vi: 'Năng lực nền tảng' },
    technique: { en: 'Business analysis technique', vi: 'Kỹ thuật phân tích nghiệp vụ' },
    perspective: { en: 'Business analysis perspective', vi: 'Góc nhìn phân tích nghiệp vụ' },
  };

  return labels[topic.kind];
}

function buildBilingualKnowledgePoints(
  question: Question,
  guide: BabokStudyGuide,
  note?: LearningNote
): BilingualStudyItem[] {
  const correct = question.options.find((option) => option.isCorrect);
  const correctVi =
    note?.status === 'ready' && note.correctAnswerVi
      ? note.correctAnswerVi
      : correct?.text || '';
  const focusKeyword = getFocusKeyword(guide.focus);

  return [
    {
      en: `${guide.primary.section} — ${guide.primary.titleEn}`,
      vi: `${guide.primary.titleVi}: ${guide.primary.summaryVi}`,
    },
    {
      en: `${focusKeyword.en} — ${guide.focus.sectionLabel}`,
      vi: `${focusKeyword.vi}: ${guide.focus.readingGuide}`,
    },
    {
      en: `Question intent — ${guide.questionIntent.en}`,
      vi: `Đề đang kiểm tra — ${guide.questionIntent.vi}`,
    },
    {
      en: `Correct answer — ${correct?.text || ''}`,
      vi: `Đáp án đúng — ${correctVi}`,
    },
    {
      en: `Exam rule — ${guide.memoryRule.en}`,
      vi: `Quy tắc ghi nhớ — ${guide.memoryRule.vi}`,
    },
  ];
}

function buildBabokKeywordRows(
  question: Question,
  guide: BabokStudyGuide,
  note?: LearningNote
): BilingualStudyItem[] {
  const correct = question.options.find((option) => option.isCorrect);
  const extracted = correct
    ? extractLearningKeywords(question.text, correct.text)
    : [];
  const focusKeyword = getFocusKeyword(guide.focus);
  const topicKindKeyword = getTopicKindKeyword(guide.primary);
  const correctVi =
    note?.status === 'ready' && note.correctAnswerVi
      ? note.correctAnswerVi
      : '';

  const candidates: BilingualStudyItem[] = [
    { en: guide.primary.titleEn, vi: guide.primary.titleVi },
    focusKeyword,
    topicKindKeyword,
    ...extracted
      .filter((item) => item.vi.trim().length > 0)
      .map((item) => ({ en: item.en, vi: item.vi })),
  ];

  if (correct && correct.text.length <= 120 && correctVi) {
    candidates.push({ en: correct.text, vi: correctVi });
  }

  const seen = new Set<string>();
  return candidates
    .filter((item) => {
      const key = normalizeBabokMatchText(item.en);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

function buildWhyCorrectExplanation(
  question: Question,
  guide: BabokStudyGuide,
  note?: LearningNote
): string {
  const correct = question.options.find((option) => option.isCorrect);
  const correctEn = correct?.text || '';
  const correctVi =
    note?.status === 'ready' && note.correctAnswerVi
      ? note.correctAnswerVi
      : correctEn;
  const normalized = normalizeBabokMatchText(question.text);
  const location = `${guide.focus.sectionLabel} — ${guide.primary.titleEn}`;

  if (/\bnot\b|\bleast\b|\bexcept\b|\bfalse\b|\bincorrect\b/.test(normalized)) {
    return `Phải khoanh “${correctVi}” vì đây là câu hỏi phủ định/loại trừ. Khi đối chiếu từng lựa chọn với ${location}, phương án này là nội dung không thuộc, không đúng hoặc ít phù hợp nhất; các phương án còn lại là những nội dung vẫn phù hợp với BABOK nên phải loại.`;
  }

  if (/\binput\b|\binputs\b|\bprerequisite\b|required before/.test(normalized)) {
    return `Phải khoanh “${correctVi}” vì đề đang hỏi INPUT. Theo ${location}, input là thông tin phải có để task bắt đầu hoặc được sử dụng/chuyển đổi trong task. Đáp án này đúng vai trò đầu vào; các lựa chọn gây nhiễu thường là output, guideline/tool hoặc đầu ra của task khác.`;
  }

  if (/\boutput\b|\boutputs\b|\bdeliverable\b|\bproduces\b|\bresult\b/.test(normalized)) {
    return `Phải khoanh “${correctVi}” vì đề đang hỏi OUTPUT. Theo ${location}, output là kết quả được tạo mới, biến đổi hoặc thay đổi trạng thái sau khi task hoàn tất. Đáp án này là kết quả của task; các phương án còn lại thường là input, technique hoặc tài liệu tham chiếu.`;
  }

  if (/\btechnique\b|best suited|most suitable|which diagram|which matrix/.test(normalized)) {
    return `Phải khoanh “${correctVi}” vì mục đích của kỹ thuật này khớp trực tiếp với việc mà tình huống cần thực hiện. BABOK đặt nội dung liên quan tại ${location}. Khi chọn technique, phải ghép mục tiêu của tình huống với Purpose/Description của technique, không chọn chỉ vì tên kỹ thuật quen thuộc.`;
  }

  if (/which task|what task|task is|knowledge area|during which task/.test(normalized)) {
    return `Phải khoanh “${correctVi}” vì hoạt động, mục đích hoặc kết quả được mô tả trong đề trùng với phạm vi của ${guide.primary.titleVi}. Nội dung này được trình bày tại ${location}; các phương án khác có thể là task BABOK thật nhưng giải quyết một mục tiêu khác.`;
  }

  if (/\bstakeholder\b|\bstakeholders\b|\bwho\b|participate|responsible/.test(normalized)) {
    return `Phải khoanh “${correctVi}” vì vai trò này phù hợp với trách nhiệm hoặc mức độ tham gia được mô tả trong ${location}. Cần phân biệt stakeholder “thường tham gia/bị ảnh hưởng” với người có quyền phê duyệt hoặc người trực tiếp thực hiện solution.`;
  }

  return `Phải khoanh “${correctVi}” vì đáp án này diễn đạt đúng nguyên tắc tại ${location}. Câu hỏi đang kiểm tra ${guide.focus.focusName.toLowerCase()}; đáp án đúng phải khớp cả bản chất khái niệm lẫn điểm hỏi, không chỉ có từ khóa cùng chủ đề. Từ khóa tiếng Anh của đáp án là “${correctEn}”.`;
}


let translationCacheMemory: Record<string, string> | null = null;

function loadTranslationCache(): Record<string, string> {
  if (translationCacheMemory) return translationCacheMemory;
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(TRANSLATION_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    translationCacheMemory = Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value === 'string')
    ) as Record<string, string>;
  } catch {
    translationCacheMemory = {};
  }

  return translationCacheMemory;
}

function saveTranslationToCache(source: string, translated: string): void {
  if (!source.trim() || !translated.trim() || typeof window === 'undefined') return;

  try {
    const cache = loadTranslationCache();
    cache[source] = translated;
    translationCacheMemory = cache;
    window.localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Bản dịch vẫn hiển thị được dù localStorage đầy hoặc bị chặn.
  }
}

async function translateEnglishToVietnamese(source: string): Promise<string> {
  const text = source.trim();
  if (!text) return '';

  const cached = loadTranslationCache()[text];
  if (cached) return cached;

  const endpoint = new URL('https://translate.googleapis.com/translate_a/single');
  endpoint.searchParams.set('client', 'gtx');
  endpoint.searchParams.set('sl', 'en');
  endpoint.searchParams.set('tl', 'vi');
  endpoint.searchParams.set('dt', 't');
  endpoint.searchParams.set('q', text);

  const response = await fetch(endpoint.toString());
  if (!response.ok) {
    throw new Error(`Dịch tự động thất bại (${response.status})`);
  }

  const data = (await response.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error('Dữ liệu bản dịch không hợp lệ');
  }

  const translated = (data[0] as unknown[])
    .map((part) => (Array.isArray(part) && typeof part[0] === 'string' ? part[0] : ''))
    .join('')
    .trim();

  if (!translated) throw new Error('Không nhận được nội dung bản dịch');
  saveTranslationToCache(text, translated);
  return translated;
}

function extractLearningKeywords(
  questionText: string,
  correctAnswerText: string
): KeywordItem[] {
  const questionLower = questionText.toLowerCase();
  const combinedLower = `${questionText} ${correctAnswerText}`.toLowerCase();

  const glossaryMatches = KEYWORD_GLOSSARY
    .filter((item) => combinedLower.includes(item.en.toLowerCase()))
    .map((item) => ({
      ...item,
      appearsInQuestion: questionLower.includes(item.en.toLowerCase()),
    }))
    .sort((left, right) => {
      if (left.appearsInQuestion !== right.appearsInQuestion) {
        return left.appearsInQuestion ? -1 : 1;
      }
      return right.en.length - left.en.length;
    });

  const selected: KeywordItem[] = [];
  glossaryMatches.forEach((candidate) => {
    const overlapsExisting = selected.some(
      (item) =>
        item.en.toLowerCase().includes(candidate.en.toLowerCase()) ||
        candidate.en.toLowerCase().includes(item.en.toLowerCase())
    );

    if (!overlapsExisting && selected.length < 6) selected.push(candidate);
  });

  if (selected.length >= 4) return selected;

  const tokens = `${questionText} ${correctAnswerText}`.match(/[A-Za-z][A-Za-z-]{3,}/g) || [];
  const frequency = new Map<string, number>();

  tokens.forEach((token) => {
    const normalized = token.toLowerCase();
    if (ENGLISH_STOP_WORDS.has(normalized)) return;
    if (selected.some((item) => item.en.toLowerCase().includes(normalized))) return;
    frequency.set(normalized, (frequency.get(normalized) || 0) + 1);
  });

  Array.from(frequency.entries())
    .sort((left, right) => right[1] - left[1] || right[0].length - left[0].length)
    .slice(0, 6 - selected.length)
    .forEach(([word]) => {
      selected.push({
        en: word,
        vi: '',
        appearsInQuestion: questionLower.includes(word),
      });
    });

  return selected;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightLearningKeywords(
  text: string,
  keywords: KeywordItem[]
): React.ReactNode {
  const phrases = keywords
    .filter((item) => item.appearsInQuestion)
    .map((item) => item.en)
    .sort((left, right) => right.length - left.length);

  if (phrases.length === 0) return text;

  const pattern = new RegExp(`(${phrases.map(escapeRegExp).join('|')})`, 'gi');
  const keywordSet = new Set(phrases.map((phrase) => phrase.toLowerCase()));

  return text.split(pattern).map((part, index) =>
    keywordSet.has(part.toLowerCase()) ? (
      <mark
        key={`${part}-${index}`}
        className="rounded-md bg-amber-300/20 px-1 text-amber-100 ring-1 ring-amber-300/30"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    )
  );
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function cleanTitleFromFile(raw: string, fileName: string): string {
  const firstLine = normalizeLineEndings(raw)
    .split('\n')
    .find((line) => line.trim().length > 0)
    ?.trim();

  return firstLine || fileName.replace(/\.txt$/i, '');
}

function isRawSet(value: unknown): value is RawSet {
  if (!value || typeof value !== 'object') return false;
  const item = value as RawSet;

  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.fileName === 'string' &&
    typeof item.raw === 'string' &&
    item.raw.trim().length > 0
  );
}

function loadSavedQuizStorage(): SavedQuizStorage | null {
  if (typeof window === 'undefined') return null;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as Partial<SavedQuizStorage>;

    if (
      !parsed ||
      parsed.version !== STORAGE_VERSION ||
      !Array.isArray(parsed.rawSets)
    ) {
      return null;
    }

    const rawSets = parsed.rawSets.filter(isRawSet);
    if (rawSets.length === 0) return null;

    const selectedSetId =
      typeof parsed.selectedSetId === 'string'
        ? parsed.selectedSetId
        : rawSets[0].id;

    const questionLimit =
      typeof parsed.questionLimit === 'string' ? parsed.questionLimit : 'all';

    const updatedAt =
      typeof parsed.updatedAt === 'string'
        ? parsed.updatedAt
        : new Date().toISOString();

    return {
      version: STORAGE_VERSION,
      rawSets,
      selectedSetId,
      questionLimit,
      updatedAt,
    };
  } catch {
    return null;
  }
}

function saveQuizStorage(
  rawSets: RawSet[],
  selectedSetId: string,
  questionLimit: string
): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const payload: SavedQuizStorage = {
      version: STORAGE_VERSION,
      rawSets,
      selectedSetId,
      questionLimit,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function clearQuizStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore localStorage errors.
  }
}

function formatSavedTime(value: string): string {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function publicFilePath(fileName: string): string {
  const baseUrl = import.meta.env.BASE_URL || '/';
  return `${baseUrl.replace(/\/$/, '')}/${fileName}`;
}

async function loadDefaultRawSets(): Promise<RawSet[]> {
  const loaded = await Promise.all(
    DEFAULT_QUIZ_FILES.map(async (file) => {
      const response = await fetch(publicFilePath(file.fileName), {
        cache: 'no-cache',
      });

      if (!response.ok) {
        throw new Error(`Không tải được ${file.fileName}`);
      }

      const raw = await response.text();

      return {
        id: file.id,
        title: cleanTitleFromFile(raw, file.fileName) || file.fallbackTitle,
        fileName: file.fileName,
        raw,
      };
    })
  );

  return loaded.filter((set) => set.raw.trim().length > 0);
}

function stripCorrectMarker(value: string): {
  text: string;
  isCorrect: boolean;
} {
  const trimmed = value.trim();
  const isCorrect = /={1,2}>\s*true\s*$/i.test(trimmed);
  const text = trimmed.replace(/\s*={1,2}>\s*true\s*$/i, '').trim();
  return { text, isCorrect };
}

function splitQuestionBlocks(raw: string): string[] {
  const normalized = normalizeLineEndings(raw);
  const regex = /Question\s+[0-9]+/gi;
  const matches: Array<{ index: number }> = [];
  let match = regex.exec(normalized);

  while (match !== null) {
    matches.push({ index: match.index });
    match = regex.exec(normalized);
  }

  return matches.map((item, itemIndex) => {
    const start = item.index;
    const end =
      itemIndex + 1 < matches.length
        ? matches[itemIndex + 1].index
        : normalized.length;
    return normalized.slice(start, end).trim();
  });
}

function findAllLabelIndexes(content: string, label: string): number[] {
  const indexes: number[] = [];
  const token = `${label})`;
  let searchFrom = 0;

  while (searchFrom < content.length) {
    const found = content.indexOf(token, searchFrom);
    if (found === -1) break;
    indexes.push(found);
    searchFrom = found + token.length;
  }

  return indexes;
}

function findOptionPositionCandidates(content: string): OptionPosition[][] {
  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
  const aIndexes = findAllLabelIndexes(content, 'A');
  const bIndexes = findAllLabelIndexes(content, 'B');
  const candidates: OptionPosition[][] = [];

  bIndexes.forEach((bIndex) => {
    const possibleAIndexes = aIndexes.filter((index) => index < bIndex);
    if (possibleAIndexes.length === 0) return;

    const positions: OptionPosition[] = [
      { index: possibleAIndexes[possibleAIndexes.length - 1], label: 'A' },
      { index: bIndex, label: 'B' },
    ];

    let searchFrom = bIndex + 2;
    labels.slice(2).forEach((label) => {
      const nextIndex = content.indexOf(`${label})`, searchFrom);
      if (nextIndex === -1) return;
      positions.push({ index: nextIndex, label });
      searchFrom = nextIndex + 2;
    });

    candidates.push(positions);
  });

  return candidates;
}

function parseQuestionBlock(
  set: RawSet,
  block: string,
  fallbackIndex: number
): Question | null {
  const numberMatch = block.match(/^Question\s+([0-9]+)/i);
  const originalNumber = numberMatch
    ? Number(numberMatch[1])
    : fallbackIndex + 1;
  const withoutHeader = block.replace(/^Question\s+[0-9]+\s*/i, '').trim();
  const candidates = findOptionPositionCandidates(withoutHeader);

  const parsedCandidates = candidates
    .map((positions) => {
      const questionText = withoutHeader.slice(0, positions[0].index).trim();
      const options: Option[] = positions.map((position, optionIndex) => {
        const start = position.index + 2;
        const end =
          optionIndex + 1 < positions.length
            ? positions[optionIndex + 1].index
            : withoutHeader.length;
        const parsed = stripCorrectMarker(withoutHeader.slice(start, end));

        return {
          id: `${set.id}-q${originalNumber}-${position.label}`,
          originalLabel: position.label,
          text: parsed.text,
          isCorrect: parsed.isCorrect,
        };
      });

      return { questionText, options };
    })
    .filter((candidate) => {
      const correctCount = candidate.options.filter(
        (option) => option.isCorrect
      ).length;
      const hasNoEmptyOptions = candidate.options.every(
        (option) => option.text.trim().length > 0
      );
      return (
        candidate.questionText.length > 0 &&
        candidate.options.length >= 2 &&
        hasNoEmptyOptions &&
        correctCount === 1
      );
    })
    .sort((left, right) => right.options.length - left.options.length);

  const selected = parsedCandidates[0];
  if (!selected) return null;

  return {
    id: `${set.id}-q${originalNumber}`,
    sourceSetId: set.id,
    sourceTitle: set.title,
    originalNumber,
    text: selected.questionText,
    options: selected.options,
  };
}

function parseQuestions(set: RawSet): Question[] {
  return splitQuestionBlocks(set.raw)
    .map((block, index) => parseQuestionBlock(set, block, index))
    .filter((question): question is Question => question !== null);
}

function buildQuizSets(rawSets: RawSet[]): QuizSet[] {
  const baseSets = rawSets.map((set) => {
    const questions = parseQuestions(set);
    return {
      id: set.id,
      title: set.title,
      description: `${questions.length} câu hỏi`,
      fileName: set.fileName,
      questions,
    };
  });

  const allQuestions = baseSets.flatMap((set) => set.questions);

  return [
    ...baseSets,
    {
      id: 'all',
      title: `Bộ ${baseSets.length + 1} - Tất cả câu hỏi`,
      description: `${allQuestions.length} câu hỏi tổng hợp từ ${baseSets.length} file`,
      fileName: 'Tổng hợp',
      questions: allQuestions,
    },
  ];
}

function runParserTests(): string[] {
  const testSets: RawSet[] = [
    {
      id: 'test-basic',
      title: 'Parser basic test',
      fileName: 'basic.txt',
      raw: `Question 1
Sample question?
A)Wrong
B)Correct => True
C)Wrong
D)Wrong

Question 2
Another question?
A)Correct ==>True
B)Wrong
C)Wrong`,
    },
    {
      id: 'test-multiline',
      title: 'Parser multiline test',
      fileName: 'multiline.txt',
      raw: `Question 10
This is a long question
with two lines?
A)First option
B)Second option with
more than one line => True
C)Third option
D)Fourth option`,
    },
    {
      id: 'test-lowercase-true',
      title: 'Parser lowercase true test',
      fileName: 'lowercase.txt',
      raw: `Question 7
Case insensitive marker?
A)Correct answer => true
B)Wrong answer`,
    },
    {
      id: 'test-compact',
      title: 'Parser compact import test',
      fileName: 'compact.txt',
      raw: `Question 1Which tool should be used?A)Wrong answerB)Correct answer => TrueC)Wrong answerD)Wrong answer

Question 2A company needs a predictive approach. What should the BA recommend?A)WaterfallB)ScrumC)AdaptiveD)Predictive => True`,
    },
    {
      id: 'test-compact-with-ba',
      title: 'Parser compact with BA abbreviation test',
      fileName: 'compact-ba.txt',
      raw: `Question 3A business analyst (BA) has completed the work. What should the BA do?A)WrongB)WrongC)Correct => TrueD)Wrong`,
    },
  ];

  const errors: string[] = [];
  const basic = parseQuestions(testSets[0]);
  const multiline = parseQuestions(testSets[1]);
  const lowercase = parseQuestions(testSets[2]);
  const compact = parseQuestions(testSets[3]);
  const compactWithBa = parseQuestions(testSets[4]);

  if (basic.length !== 2)
    errors.push(`Expected 2 basic test questions, got ${basic.length}`);
  if (basic[0]?.options.length !== 4)
    errors.push('Expected first basic question to have 4 options');
  if (
    basic[0]?.options.find((option) => option.isCorrect)?.text !== 'Correct'
  ) {
    errors.push('Expected parser to remove => True marker');
  }
  if (!basic[1]?.options[0]?.isCorrect)
    errors.push('Expected parser to support ==>True marker');
  if (multiline.length !== 1)
    errors.push(`Expected 1 multiline question, got ${multiline.length}`);
  if (!multiline[0]?.text.includes('with two lines'))
    errors.push('Expected parser to support multiline question text');
  if (!multiline[0]?.options[1]?.text.includes('more than one line'))
    errors.push('Expected parser to support multiline option text');
  if (lowercase.length !== 1)
    errors.push(
      `Expected 1 lowercase marker question, got ${lowercase.length}`
    );
  if (!lowercase[0]?.options[0]?.isCorrect)
    errors.push('Expected parser to support lowercase => true marker');
  if (compact.length !== 2)
    errors.push(`Expected 2 compact questions, got ${compact.length}`);
  if (compact[0]?.text !== 'Which tool should be used?')
    errors.push(
      'Expected compact parser to separate question text from A) option'
    );
  if (compact[1]?.options[3]?.isCorrect !== true)
    errors.push(
      'Expected compact parser to support adjacent D) correct answer'
    );
  if (compactWithBa.length !== 1)
    errors.push(`Expected 1 compact BA question, got ${compactWithBa.length}`);
  if (!compactWithBa[0]?.text.includes('(BA)'))
    errors.push('Expected parser not to treat BA) as answer A)');

  return errors;
}

function createImportReport(rawSets: RawSet[]): ImportReport {
  const warnings = runParserTests();
  const quizSets = buildQuizSets(rawSets);
  const baseSets = quizSets.filter((set) => set.id !== 'all');
  const parsedQuestionCount = baseSets.reduce(
    (sum, set) => sum + set.questions.length,
    0
  );

  baseSets.forEach((set) => {
    const rawSet = rawSets.find((item) => item.id === set.id);
    const rawBlockCount = splitQuestionBlocks(rawSet?.raw || '').length;

    if (rawBlockCount !== set.questions.length) {
      warnings.push(
        `${set.title}: đọc được ${set.questions.length}/${rawBlockCount} câu. Các câu bị bỏ qua thường thiếu đáp án đúng hoặc sai định dạng.`
      );
    }

    if (set.questions.length === 0) {
      warnings.push(`${set.title}: chưa parse được câu hỏi hợp lệ nào.`);
    }
  });

  return {
    fileCount: rawSets.length,
    parsedQuestionCount,
    warnings,
  };
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cn(...classes: Array<string | false | undefined | null>): string {
  return classes.filter(Boolean).join(' ');
}

async function readTextFiles(files: FileList | null): Promise<RawSet[]> {
  if (!files || files.length === 0) return [];

  const selectedFiles = Array.from(files)
    .filter(
      (file) =>
        file.type.includes('text') || file.name.toLowerCase().endsWith('.txt')
    )
    .sort((left, right) =>
      left.name.localeCompare(right.name, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    );

  return Promise.all(
    selectedFiles.map(async (file, index) => {
      const raw = await file.text();
      return {
        id: `file-${index + 1}`,
        title: cleanTitleFromFile(raw, file.name),
        fileName: file.name,
        raw,
      };
    })
  );
}

function LearningNotePanel({
  note,
  onRetry,
}: {
  note: LearningNote;
  onRetry: () => void;
}) {
  return (
    <section className="mt-4 rounded-2xl border border-amber-300/35 bg-amber-300/[0.075] px-4 py-3.5 shadow-inner shadow-amber-950/10">
      {note.status === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-200" />
          Đang dịch câu hỏi và đáp án đúng...
        </div>
      )}

      {note.status === 'ready' && (
        <div className="space-y-3 text-[13px] leading-6 text-slate-100 sm:text-sm">
          <p>
            <span className="font-bold text-cyan-200">Câu hỏi:</span>{' '}
            {note.questionVi}
          </p>
          <p>
            <span className="font-bold text-emerald-200">Ý đúng cần nhớ:</span>{' '}
            {note.correctAnswerVi}
          </p>
        </div>
      )}

      {note.status === 'error' && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs leading-5 text-rose-100">
          <span>{note.errorMessage || 'Chưa dịch được. Hãy kiểm tra kết nối mạng.'}</span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-200/30 px-2 py-1 font-semibold hover:bg-rose-200/10"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Dịch lại
          </button>
        </div>
      )}
    </section>
  );
}



type RequirementsArchitecturePattern =
  | 'purpose'
  | 'traceability'
  | 'relationship-quality'
  | 'techniques'
  | 'viewpoints'
  | 'completeness'
  | 'inputs'
  | 'output'
  | 'general';

function detectRequirementsArchitecturePattern(
  question: Question
): RequirementsArchitecturePattern {
  const correct = question.options.find((option) => option.isCorrect)?.text || '';
  const text = `${question.text} ${correct}`.toLowerCase();

  if (/\btechniques?\b|not a stated technique|which.*technique/.test(text)) {
    return 'techniques';
  }

  if (
    /quality criteria|criterion|necessary|unambiguous|consistent|testable|defined relationship/.test(
      text
    )
  ) {
    return 'relationship-quality';
  }

  if (/traceability|links? back to an objective|objective was met/.test(text)) {
    return 'traceability';
  }

  if (/viewpoint|view\b|template architecture|architectural framework/.test(text)) {
    return 'viewpoints';
  }

  if (/organize requirements based on.*solution components/.test(text)) {
    return 'general';
  }

  if (/\binputs?\b|information management approach|requirements \(any state\)|solution scope/.test(text)) {
    return 'inputs';
  }

  if (/\boutputs?\b|interrelationships among them|contextual information/.test(text)) {
    return 'output';
  }

  if (/complete|completeness|missing|contradictory|inconsistent|full story|gap/.test(text)) {
    return 'completeness';
  }

  if (
    /purpose|collectively support|work in harmony|single whole|fit together|overall objectives|meaningful whole/.test(
      text
    )
  ) {
    return 'purpose';
  }

  return 'general';
}

function getRequirementsArchitecturePatternCard(
  pattern: RequirementsArchitecturePattern
): {
  label: string;
  triggerEn: string;
  triggerVi: string;
  actionEn: string;
  actionVi: string;
} {
  const cards: Record<RequirementsArchitecturePattern, {
    label: string;
    triggerEn: string;
    triggerVi: string;
    actionEn: string;
    actionVi: string;
  }> = {
    purpose: {
      label: 'PURPOSE / MỤC ĐÍCH',
      triggerEn: 'collectively support · fit together · single whole · overall objectives',
      triggerVi: 'cùng hỗ trợ nhau · ghép lại · một chỉnh thể · đạt mục tiêu chung',
      actionEn: 'Choose Define Requirements Architecture.',
      actionVi: 'Khoanh Define Requirements Architecture.',
    },
    traceability: {
      label: 'TRAP / BẪY TRACEABILITY',
      triggerEn: 'link back to objective · show how objective was met',
      triggerVi: 'truy ngược về mục tiêu · chứng minh mục tiêu được đáp ứng',
      actionEn: 'That is Trace Requirements, not architecture.',
      actionVi: 'Đó là Trace Requirements, không phải kiến trúc yêu cầu.',
    },
    'relationship-quality': {
      label: 'RELATIONSHIP CHECK / KIỂM TRA QUAN HỆ',
      triggerEn: 'quality criteria for requirement relationships',
      triggerVi: 'tiêu chí chất lượng của mối quan hệ giữa yêu cầu',
      actionEn: 'Recall D-N-C-U-C; “Testable” is the usual distractor.',
      actionVi: 'Nhớ D-N-C-U-C; “Testable” thường là đáp án nhiễu.',
    },
    techniques: {
      label: 'TECHNIQUE / KỸ THUẬT',
      triggerEn: 'NOT a technique for Define Requirements Architecture',
      triggerVi: 'KHÔNG phải kỹ thuật của Define Requirements Architecture',
      actionEn: 'Recall D-F-I-O-S-W; Process Modelling is not listed.',
      actionVi: 'Nhớ D-F-I-O-S-W; Process Modelling không nằm trong danh sách.',
    },
    viewpoints: {
      label: 'VIEWPOINTS / GÓC NHÌN',
      triggerEn: 'viewpoint · view · template architecture · framework',
      triggerVi: 'quy ước góc nhìn · sản phẩm thực tế · kiến trúc mẫu · framework',
      actionEn: 'Viewpoint = rules/template; View = actual requirements/designs.',
      actionVi: 'Viewpoint = quy ước/mẫu; View = yêu cầu và thiết kế thực tế.',
    },
    completeness: {
      label: 'COMPLETENESS / TÍNH ĐẦY ĐỦ',
      triggerEn: 'missing · inconsistent · contradictory · dependencies · full story',
      triggerVi: 'thiếu · không nhất quán · mâu thuẫn · phụ thuộc · câu chuyện đầy đủ',
      actionEn: 'Architecture checks whether the whole set is cohesive and complete.',
      actionVi: 'Kiến trúc kiểm tra toàn bộ tập yêu cầu có đầy đủ và gắn kết hay không.',
    },
    inputs: {
      label: 'INPUTS / ĐẦU VÀO',
      triggerEn: 'input to Define Requirements Architecture',
      triggerVi: 'đầu vào của Define Requirements Architecture',
      actionEn: 'Recall I-R-S: Information Management Approach, Requirements, Solution Scope.',
      actionVi: 'Nhớ I-R-S: cách quản lý thông tin, yêu cầu, phạm vi giải pháp.',
    },
    output: {
      label: 'OUTPUT / ĐẦU RA',
      triggerEn: 'requirements + interrelationships + contextual information',
      triggerVi: 'yêu cầu + quan hệ giữa chúng + thông tin bối cảnh',
      actionEn: 'The output is Requirements Architecture.',
      actionVi: 'Đầu ra là Requirements Architecture.',
    },
    general: {
      label: 'CORE / CỐT LÕI',
      triggerEn: 'structure · organize · relate · cohesive whole',
      triggerVi: 'cấu trúc · tổ chức · liên kết · chỉnh thể gắn kết',
      actionEn: 'Think “many requirements → one working whole”.',
      actionVi: 'Nghĩ “nhiều yêu cầu → một chỉnh thể hoạt động được”.',
    },
  };

  return cards[pattern];
}

function buildRequirementsArchitectureWhy(
  question: Question,
  correctText: string,
  pattern: RequirementsArchitecturePattern
): string {
  const negative = /\bnot\b|\bleast\b|\bexcept\b|\bfalse\b|\bincorrect\b/i.test(
    question.text
  );

  if (pattern === 'techniques') {
    return `Khoanh “${correctText}” vì BABOK 7.4.6 chỉ liệt kê Data Modelling, Functional Decomposition, Interviews, Organizational Modelling, Scope Modelling và Workshops. ${correctText} không nằm trong nhóm này${negative ? ', nên là phương án cần chọn trong câu NOT/EXCEPT' : ''}.`;
  }

  if (pattern === 'relationship-quality') {
    return `Khoanh “${correctText}” vì tiêu chí kiểm tra quan hệ trong kiến trúc yêu cầu là Defined, Necessary, Correct, Unambiguous và Consistent. “Testable” là đặc tính chất lượng của requirement, không phải tiêu chí của relationship.`;
  }

  if (pattern === 'traceability') {
    return `Khoanh “${correctText}” vì câu này mô tả traceability: liên kết requirement về objective và cho thấy objective được đáp ứng thế nào. Requirements Architecture hỏi các phần có ghép thành một chỉnh thể gắn kết và hoạt động được hay không.`;
  }

  if (pattern === 'viewpoints') {
    return `Khoanh “${correctText}” vì BABOK 7.4.4 dùng viewpoints, views và template architectures để tổ chức requirements theo mối quan tâm của từng stakeholder. Viewpoint là bộ quy ước/mẫu; view là nội dung requirement/design thực tế được tạo ra theo góc nhìn đó.`;
  }

  if (pattern === 'inputs') {
    return `Khoanh “${correctText}” khi nó thuộc bộ I-R-S: Information Management Approach, Requirements (any state), Solution Scope. Đây là ba đầu vào chính thức của Define Requirements Architecture.`;
  }

  if (pattern === 'output') {
    return `Khoanh “${correctText}” vì đầu ra của task là Requirements Architecture: tập requirements, các interrelationships giữa chúng và contextual information được ghi nhận.`;
  }

  if (pattern === 'completeness') {
    return `Khoanh “${correctText}” vì architecture giúp nhìn toàn bộ tập requirements như một câu chuyện đầy đủ: không thiếu, không mâu thuẫn, không nhất quán và đã xét các dependencies có thể cản trở objective.`;
  }

  return `Khoanh “${correctText}” vì key của Define Requirements Architecture là WHOLE: các requirements, models và specifications phải cùng hỗ trợ nhau, ghép thành một chỉnh thể thống nhất và đạt overall business objectives. Đề có các từ như “collectively support”, “fit together”, “work in harmony” hoặc “single whole” thì bắt ngay task 7.4.`;
}

function RequirementsArchitectureMemoryPanel({
  question,
  note,
  selectedOptionId,
  guide,
  compact,
}: {
  question: Question;
  note?: LearningNote;
  selectedOptionId?: string;
  guide: BabokStudyGuide;
  compact: boolean;
}) {
  const pattern = detectRequirementsArchitecturePattern(question);
  const patternCard = getRequirementsArchitecturePatternCard(pattern);
  const correct = question.options.find((option) => option.isCorrect);
  const correctIndex = question.options.findIndex((option) => option.isCorrect);
  const correctLabel =
    correctIndex >= 0 ? ANSWER_LABELS[correctIndex] : correct?.originalLabel || '';
  const correctVi =
    note?.status === 'ready' && note.correctAnswerVi
      ? note.correctAnswerVi
      : correct?.text || '';
  const whyCorrect = buildRequirementsArchitectureWhy(
    question,
    correct?.text || '',
    pattern
  );
  const selectedReason = guide.optionReasons.find(
    (item) => item.optionId === selectedOptionId
  );
  const selectedWasWrong = Boolean(selectedReason && !selectedReason.isCorrect);
  const pageRange = getBabokBookPageRange(guide.primary);
  const pdfPage = babokPdfPage(pageRange.start);

  const relatedQuestionPatterns = [
    ['Purpose', 'collectively support / harmony / one whole', 'Define Requirements Architecture'],
    ['NOT description', 'links back to objective', 'Traceability statement = distractor'],
    ['NOT technique', 'Process Modelling', 'Not listed in 7.4.6'],
    ['NOT relationship criterion', 'Testable', 'Not in D-N-C-U-C'],
    ['Element', 'Template Architectures', 'Predefined viewpoints/framework'],
  ];

  return (
    <section
      className={cn(
        'mt-4 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.055] shadow-inner shadow-cyan-950/10',
        compact ? 'p-3' : 'p-3.5 md:p-4'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-300 px-2.5 py-1 text-[10px] font-black tracking-[0.12em] text-cyan-950">
              <BookOpen className="h-3.5 w-3.5" /> KEY MASTER 7.4
            </span>
            <span className="text-[11px] font-bold text-white">
              DEFINE REQUIREMENTS ARCHITECTURE
            </span>
            <span className="text-[11px] text-cyan-100/80">
              Xác định kiến trúc yêu cầu
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            BABOK 7.4 · Trang in 148–151 · Trang PDF {pdfPage}–{babokPdfPage(151)}
          </p>
        </div>
        <a
          href={babokPdfHref(148)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-cyan-200/20 bg-cyan-200/10 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-200/20"
        >
          Mở BABOK <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-200/25 bg-emerald-200/[0.065] p-3">
            <div className="flex items-start gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-300 text-xs font-black text-emerald-950">
                {correctLabel}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.13em] text-emerald-200">
                  Chốt câu này
                </p>
                <p className="mt-1 text-[12px] font-bold leading-5 text-white">
                  {correct?.text}
                </p>
                {correctVi !== correct?.text && (
                  <p className="mt-0.5 text-[11px] leading-5 text-amber-100">
                    {correctVi}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-200">{whyCorrect}</p>
            {selectedWasWrong && selectedReason && (
              <p className="mt-2 rounded-lg border border-rose-200/15 bg-rose-200/[0.05] px-2.5 py-2 text-[10.5px] leading-[18px] text-rose-100">
                <span className="font-bold text-rose-200">Bẫy bạn vừa dính: </span>
                {selectedReason.explanationVi}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-amber-200/20 bg-amber-200/[0.05] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.13em] text-amber-200">
              Bắt key trong 3 giây — {patternCard.label}
            </p>
            <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg border border-white/10 text-[10.5px] leading-[18px]">
              <div className="border-r border-white/10 bg-slate-950/30 px-2.5 py-2">
                <p className="font-bold text-cyan-100">EN key</p>
                <p className="mt-1 text-slate-200">{patternCard.triggerEn}</p>
                <p className="mt-1 font-semibold text-emerald-200">→ {patternCard.actionEn}</p>
              </div>
              <div className="bg-slate-950/30 px-2.5 py-2">
                <p className="font-bold text-amber-100">Key tiếng Việt</p>
                <p className="mt-1 text-slate-200">{patternCard.triggerVi}</p>
                <p className="mt-1 font-semibold text-emerald-200">→ {patternCard.actionVi}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid content-start gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.13em] text-cyan-200">
              Công thức gốc: WHOLE
            </p>
            <p className="mt-1.5 text-[11px] leading-[18px] text-white">
              <span className="font-bold text-cyan-100">EN:</span> Requirements + models + specifications → fit together → one cohesive whole → objectives.
            </p>
            <p className="mt-1 text-[11px] leading-[18px] text-slate-300">
              <span className="font-bold text-amber-100">VI:</span> Nhiều yêu cầu/mô hình → ghép đúng cấu trúc → thành một chỉnh thể → đạt mục tiêu chung.
            </p>
          </div>

          <div className="rounded-xl border border-rose-200/20 bg-rose-200/[0.045] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.13em] text-rose-200">
              Không nhầm: Architecture ≠ Traceability
            </p>
            <div className="mt-1.5 grid grid-cols-2 gap-2 text-[10.5px] leading-[18px]">
              <div>
                <p className="font-bold text-cyan-100">Architecture</p>
                <p className="text-slate-300">Do the parts work as one whole?</p>
                <p className="text-slate-400">Các phần có vận hành như một chỉnh thể?</p>
              </div>
              <div>
                <p className="font-bold text-amber-100">Traceability</p>
                <p className="text-slate-300">Where did it come from / what does it satisfy?</p>
                <p className="text-slate-400">Yêu cầu đến từ đâu / đáp ứng mục tiêu nào?</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-violet-200/20 bg-violet-200/[0.045] p-3 sm:col-span-2 lg:col-span-1">
            <p className="text-[10px] font-black uppercase tracking-[0.13em] text-violet-200">
              2 mã nhớ phải thuộc
            </p>
            <div className="mt-1.5 grid grid-cols-2 gap-2 text-[10.5px] leading-[18px]">
              <div>
                <p className="font-black text-white">D-N-C-U-C</p>
                <p className="text-slate-300">Defined · Necessary · Correct · Unambiguous · Consistent</p>
                <p className="text-slate-400">Quan hệ: Có định nghĩa · Cần · Đúng · Rõ · Nhất quán</p>
              </div>
              <div>
                <p className="font-black text-white">D-F-I-O-S-W</p>
                <p className="text-slate-300">Data · Functional · Interviews · Organizational · Scope · Workshops</p>
                <p className="text-slate-400">6 techniques; không có Process Modelling</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="mt-3 grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/25">
            <div className="grid grid-cols-[0.72fr_1.15fr_1fr] bg-white/[0.06] px-2.5 py-1.5 text-[9.5px] font-black uppercase tracking-[0.1em]">
              <span className="text-violet-200">Dạng câu</span>
              <span className="text-cyan-200">Key nhìn thấy</span>
              <span className="text-amber-200">Phản xạ cần có</span>
            </div>
            {relatedQuestionPatterns.map(([type, key, reaction]) => (
              <div
                key={type}
                className="grid grid-cols-[0.72fr_1.15fr_1fr] border-t border-white/10 px-2.5 py-1.5 text-[10.5px] leading-4"
              >
                <span className="font-semibold text-slate-100">{type}</span>
                <span className="pr-2 text-slate-300">{key}</span>
                <span className="text-slate-300">{reaction}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] leading-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-2.5">
              <p className="font-black text-cyan-200">INPUTS — I-R-S</p>
              <p className="mt-1 text-slate-300">Information Management Approach</p>
              <p className="text-slate-300">Requirements (any state)</p>
              <p className="text-slate-300">Solution Scope</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.025] p-2.5">
              <p className="font-black text-amber-200">ELEMENTS — V-T-C-R-I</p>
              <p className="mt-1 text-slate-300">Viewpoints & Views</p>
              <p className="text-slate-300">Template Architectures</p>
              <p className="text-slate-300">Completeness</p>
              <p className="text-slate-300">Relate & Verify Relationships</p>
              <p className="text-slate-300">BA Information Architecture</p>
            </div>
            <div className="col-span-2 rounded-xl border border-white/10 bg-white/[0.025] px-2.5 py-2">
              <p className="font-black text-emerald-200">
                OUTPUT: Requirements Architecture
              </p>
              <p className="mt-0.5 text-slate-300">
                Requirements + interrelationships + recorded contextual information.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-[10px] text-slate-500">
        <span>Nhớ một câu: <strong className="text-slate-300">Architecture = MANY → ONE WHOLE</strong></span>
        <span>7.4.1 Purpose · 7.4.4 Elements · 7.4.6 Techniques · 7.4.8 Output</span>
      </div>
    </section>
  );
}

function BabokStudyGuidePanel({
  question,
  note,
  selectedOptionId,
  compact = false,
}: {
  question: Question;
  note?: LearningNote;
  selectedOptionId?: string;
  compact?: boolean;
}) {
  const guide = buildBabokStudyGuide(question);
  const { primary, related, focus } = guide;
  const pageRange = getBabokBookPageRange(primary);
  const pdfPageStart = babokPdfPage(pageRange.start);
  const pdfPageEnd = babokPdfPage(pageRange.end);
  const correct = question.options.find((option) => option.isCorrect);
  const correctIndex = question.options.findIndex((option) => option.isCorrect);
  const correctLabel =
    correctIndex >= 0 ? ANSWER_LABELS[correctIndex] : correct?.originalLabel || '';
  const correctVi =
    note?.status === 'ready' && note.correctAnswerVi
      ? note.correctAnswerVi
      : correct?.text || '';
  const whyCorrect = buildWhyCorrectExplanation(question, guide, note);
  const knowledgePoints = buildBilingualKnowledgePoints(question, guide, note);
  const keywordRows = buildBabokKeywordRows(question, guide, note);
  const selectedReason = guide.optionReasons.find(
    (item) => item.optionId === selectedOptionId
  );
  const selectedWasWrong = Boolean(selectedReason && !selectedReason.isCorrect);

  if (primary.section === '7.4') {
    return (
      <RequirementsArchitectureMemoryPanel
        question={question}
        note={note}
        selectedOptionId={selectedOptionId}
        guide={guide}
        compact={compact}
      />
    );
  }

  return (
    <section
      className={cn(
        'mt-4 rounded-2xl border border-violet-300/30 bg-violet-300/[0.075] shadow-inner shadow-violet-950/10',
        compact ? 'px-4 py-3.5' : 'px-4 py-4 md:px-5'
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/20 bg-violet-200/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-violet-100">
              <BookOpen className="h-3.5 w-3.5" /> Giải thích theo BABOK v3
            </span>
            <span className="rounded-full bg-slate-950/50 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
              {focus.sectionLabel}
            </span>
          </div>

          <h3 className="mt-3 text-base font-bold leading-6 text-white">
            {primary.titleEn}
          </h3>
          <p className="mt-0.5 text-sm font-medium leading-5 text-violet-100">
            {primary.titleVi}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">
            {primary.chapter} → {focus.sectionLabel} · Trang in BABOK {pageRange.start}
            {pageRange.end > pageRange.start ? `–${pageRange.end}` : ''} · Trang PDF{' '}
            {pdfPageStart}{pdfPageEnd > pdfPageStart ? `–${pdfPageEnd}` : ''}
          </p>
        </div>

        <a
          href={babokPdfHref(pageRange.start)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-violet-200/25 bg-violet-200/10 px-3 py-2 text-xs font-semibold text-violet-100 transition hover:bg-violet-200/20"
          title={`Mở ${BABOK_PDF_PUBLIC_FILE} tại trang PDF ${pdfPageStart}`}
        >
          Mở đúng mục BABOK <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-200/25 bg-emerald-200/[0.07] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-300 text-sm font-black text-emerald-950">
            {correctLabel}
          </span>
          <p className="text-sm font-bold text-emerald-100">
            Vì sao phải khoanh đáp án này?
          </p>
        </div>

        <div className="mt-3 grid overflow-hidden rounded-xl border border-white/10 md:grid-cols-2">
          <div className="border-b border-white/10 bg-slate-950/35 p-3 md:border-b-0 md:border-r">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-200">
              Correct answer — English
            </p>
            <p className="mt-1.5 text-[13px] font-semibold leading-6 text-white">
              {correct?.text}
            </p>
          </div>
          <div className="bg-slate-950/35 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">
              Đáp án đúng — Tiếng Việt
            </p>
            <p className="mt-1.5 text-[13px] font-semibold leading-6 text-white">
              {correctVi}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[13px] leading-6 text-slate-100">{whyCorrect}</p>

        {selectedWasWrong && selectedReason && (
          <div className="mt-3 rounded-xl border border-rose-200/20 bg-rose-200/[0.06] p-3 text-[12px] leading-5 text-rose-50">
            <span className="font-bold text-rose-200">Vì sao lựa chọn của bạn chưa đúng: </span>
            {selectedReason.explanationVi}
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-200">
            Các đầu mục cần nắm để làm được câu này
          </p>
          <span className="text-[10px] text-slate-500">English key ↔ Giải thích tiếng Việt</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="grid grid-cols-2 bg-white/[0.07] text-[11px] font-bold uppercase tracking-[0.12em]">
            <div className="border-r border-white/10 px-3 py-2 text-cyan-200">English</div>
            <div className="px-3 py-2 text-amber-200">Tiếng Việt</div>
          </div>
          {knowledgePoints.map((item, index) => (
            <div
              key={`${item.en}-${index}`}
              className="grid grid-cols-2 border-t border-white/10 bg-slate-950/30 text-[12px] leading-5 sm:text-[13px] sm:leading-6"
            >
              <div className="border-r border-white/10 px-3 py-2.5 font-medium text-slate-100">
                {item.en}
              </div>
              <div className="px-3 py-2.5 text-slate-200">{item.vi}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200">
          Key words cần thuộc
        </p>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="grid grid-cols-2 bg-white/[0.07] text-[11px] font-bold uppercase tracking-[0.12em]">
            <div className="border-r border-white/10 px-3 py-2 text-cyan-200">English keyword</div>
            <div className="px-3 py-2 text-amber-200">Nghĩa tiếng Việt</div>
          </div>
          {keywordRows.map((item, index) => (
            <div
              key={`${item.en}-${index}`}
              className="grid grid-cols-2 border-t border-white/10 bg-slate-950/30 text-[12px] leading-5 sm:text-[13px]"
            >
              <div className="border-r border-white/10 px-3 py-2 font-semibold text-cyan-50">
                {item.en}
              </div>
              <div className="px-3 py-2 text-slate-200">{item.vi}</div>
            </div>
          ))}
        </div>
      </div>

      {!compact && (
        <details
          className="mt-4 rounded-xl border border-white/10 bg-slate-950/30 p-3.5"
          open={selectedWasWrong}
        >
          <summary className="cursor-pointer text-[12px] font-bold text-violet-100">
            Phân tích và loại trừ từng phương án
          </summary>
          <div className="mt-3 space-y-2.5">
            {guide.optionReasons.map((item) => {
              const isSelected = item.optionId === selectedOptionId;
              return (
                <div
                  key={item.optionId}
                  className={cn(
                    'rounded-xl border p-3 text-[12px] leading-5',
                    item.isCorrect
                      ? 'border-emerald-200/25 bg-emerald-200/[0.055]'
                      : isSelected
                      ? 'border-rose-200/25 bg-rose-200/[0.055]'
                      : 'border-white/10 bg-white/[0.025]'
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-black',
                        item.isCorrect
                          ? 'bg-emerald-300 text-emerald-950'
                          : 'bg-white/10 text-slate-200'
                      )}
                    >
                      {item.label}
                    </span>
                    <span className="font-semibold text-slate-100">{item.optionText}</span>
                    {item.isCorrect && (
                      <span className="rounded-full bg-emerald-300/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                        Đáp án đúng
                      </span>
                    )}
                    {isSelected && !item.isCorrect && (
                      <span className="rounded-full bg-rose-300/15 px-2 py-0.5 text-[10px] font-bold text-rose-200">
                        Bạn đã chọn
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-slate-300">{item.explanationVi}</p>
                </div>
              );
            })}
          </div>
        </details>
      )}

      <div className="mt-4 rounded-xl border border-violet-200/15 bg-violet-200/[0.045] p-3.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-200">
          Công thức nhớ nhanh
        </p>
        <p className="mt-2 text-[12px] leading-5 text-slate-200">
          <span className="font-semibold text-cyan-100">EN:</span> {guide.memoryRule.en}
        </p>
        <p className="mt-1 text-[12px] leading-5 text-slate-200">
          <span className="font-semibold text-amber-100">VI:</span> {guide.memoryRule.vi}
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Nguồn: public/{BABOK_PDF_PUBLIC_FILE} · Mục {focus.sectionLabel}
        </span>
        <span>{guide.answerTakeaway}</span>
      </div>

      {related.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400">Đọc thêm liên quan:</span>
          {related.map((topic) => (
            <a
              key={topic.id}
              href={babokPdfHref(topic.bookPage)}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-slate-200 transition hover:border-violet-200/30 hover:bg-violet-200/10"
            >
              {topic.section} {topic.titleEn}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-3 text-cyan-100">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

export default function QuizLearningApp() {
  const [rawSets, setRawSets] = useState<RawSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [questionLimit, setQuestionLimit] = useState('all');
  const [search, setSearch] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [learningNotes, setLearningNotes] = useState<Record<string, LearningNote>>({});
  const [hasSavedData, setHasSavedData] = useState(false);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);
  const [importStatus, setImportStatus] = useState(
    'Đang tải 9 bộ đề mặc định từ thư mục public...'
  );

  const loadBundledDefaultData = async (statusPrefix?: string) => {
    setIsLoadingDefaults(true);

    try {
      const defaults = await loadDefaultRawSets();
      const nextRawSets = defaults.length > 0 ? defaults : DEMO_RAW_SETS;
      const nextSelectedSetId = nextRawSets[0]?.id || 'all';
      const temporaryReport = createImportReport(nextRawSets);

      setRawSets(nextRawSets);
      setSelectedSetId(nextSelectedSetId);
      setSession(null);
      setCurrentIndex(0);
      setHasSavedData(false);
      setImportStatus(
        statusPrefix ||
          `Đã tải ${temporaryReport.fileCount} bộ đề mặc định từ public, parse được ${temporaryReport.parsedQuestionCount} câu.`
      );
    } catch (error) {
      setRawSets(DEMO_RAW_SETS);
      setSelectedSetId('demo-1');
      setSession(null);
      setCurrentIndex(0);
      setHasSavedData(false);
      setImportStatus(
        'Chưa tải được 9 file mặc định trong public. App đang dùng bộ demo. Hãy kiểm tra tên file CCBA1.txt đến CCBA9.txt.'
      );
    } finally {
      setIsLoadingDefaults(false);
    }
  };

  useEffect(() => {
    const savedStorage = loadSavedQuizStorage();

    if (savedStorage) {
      const selectedExists =
        savedStorage.selectedSetId === 'all' ||
        savedStorage.rawSets.some((set) => set.id === savedStorage.selectedSetId);

      setRawSets(savedStorage.rawSets);
      setSelectedSetId(
        selectedExists ? savedStorage.selectedSetId : savedStorage.rawSets[0].id
      );
      setQuestionLimit(savedStorage.questionLimit);
      setHasSavedData(true);
      setImportStatus(
        `Đã tải lại ${savedStorage.rawSets.length} bộ đề đã lưu trên trình duyệt. Lưu gần nhất: ${formatSavedTime(
          savedStorage.updatedAt
        )}. Bấm “Khôi phục 9 bộ mặc định” nếu muốn dùng lại dữ liệu trong public.`
      );
      setIsLoadingDefaults(false);
      return;
    }

    void loadBundledDefaultData();
  }, []);

  useEffect(() => {
    if (!hasSavedData || rawSets.length === 0) return;

    const saved = saveQuizStorage(rawSets, selectedSetId, questionLimit);

    if (!saved) {
      setImportStatus(
        'Dữ liệu hiện tại vẫn dùng được, nhưng chưa lưu được vào trình duyệt. Có thể localStorage đã đầy hoặc trình duyệt đang chặn lưu dữ liệu.'
      );
    }
  }, [hasSavedData, rawSets, selectedSetId, questionLimit]);

  const parsedSets = useMemo<QuizSet[]>(
    () => buildQuizSets(rawSets),
    [rawSets]
  );

  const importReport = useMemo<ImportReport>(
    () => createImportReport(rawSets),
    [rawSets]
  );

  const selectedSet =
    parsedSets.find((set) => set.id === selectedSetId) || parsedSets[0];

  const filteredSets = parsedSets.filter((set) =>
    set.title.toLowerCase().includes(search.toLowerCase())
  );

  const score = useMemo(() => {
    if (!session) return { correct: 0, total: 0, percent: 0, unanswered: 0 };

    const correct = session.questions.filter((question) => {
      const picked = session.answers[question.id];
      return question.options.find((option) => option.id === picked)?.isCorrect;
    }).length;

    const total = session.questions.length;
    const unanswered = session.questions.filter(
      (question) => !session.answers[question.id]
    ).length;
    const percent = total ? Math.round((correct / total) * 100) : 0;

    return { correct, total, percent, unanswered };
  }, [session]);

  const scrollToPageTop = (behavior: ScrollBehavior = 'smooth') => {
    if (typeof window === 'undefined') return;

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior });
    });
  };

  const startQuiz = (setId = selectedSetId) => {
    const quizSet = parsedSets.find((set) => set.id === setId) || parsedSets[0];
    if (!quizSet || quizSet.questions.length === 0) return;

    const shuffledQuestions = shuffleArray(quizSet.questions);
    const limitedQuestions =
      questionLimit === 'all'
        ? shuffledQuestions
        : shuffledQuestions.slice(0, Number(questionLimit));
    const preparedQuestions = limitedQuestions.map((question) => ({
      ...question,
      options: shuffleArray(question.options),
    }));

    setSession({
      setId: quizSet.id,
      setTitle: quizSet.title,
      questions: preparedQuestions,
      answers: {},
      submitted: false,
    });
    setCurrentIndex(0);
    scrollToPageTop('auto');
  };

  const importFiles = async (files: FileList | null) => {
    const imported = await readTextFiles(files);
    if (!imported.length) {
      setImportStatus(
        'Không đọc được file .txt nào. Hãy chọn lại đúng các file câu hỏi dạng .txt.'
      );
      return;
    }

    const nextSelectedSetId = imported[0].id;
    const temporaryReport = createImportReport(imported);
    const saved = saveQuizStorage(imported, nextSelectedSetId, questionLimit);

    setRawSets(imported);
    setSelectedSetId(nextSelectedSetId);
    setSession(null);
    setCurrentIndex(0);
    setHasSavedData(saved);

    setImportStatus(
      `Đã import ${temporaryReport.fileCount} file, parse được ${temporaryReport.parsedQuestionCount} câu. App đã tạo ${temporaryReport.fileCount} bộ riêng và 1 bộ tổng hợp cuối. ${
        saved
          ? 'Dữ liệu import đã được lưu trên trình duyệt hiện tại.'
          : 'Chưa lưu được vào trình duyệt, có thể localStorage đã đầy hoặc bị chặn.'
      }`
    );
  };

  const resetToDefaultData = async () => {
    clearQuizStorage();
    await loadBundledDefaultData(
      'Đã xóa dữ liệu đã lưu trên trình duyệt và khôi phục lại 9 bộ đề mặc định từ public.'
    );
  };

  const deleteQuizSet = async (setId: string) => {
    if (setId === 'all') return;

    const targetSet = rawSets.find((set) => set.id === setId);
    if (!targetSet) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa bộ đề "${targetSet.title}" không?\n\nLưu ý: thao tác này chỉ xóa/ẩn trên trình duyệt hiện tại. File gốc trong Git vẫn còn.`
    );

    if (!confirmed) return;

    const nextRawSets = rawSets.filter((set) => set.id !== setId);

    if (nextRawSets.length === 0) {
      clearQuizStorage();
      await loadBundledDefaultData(
        'Bạn đã xóa hết bộ đề hiện tại. App đã khôi phục lại 9 bộ đề mặc định từ public.'
      );
      return;
    }

    const nextSelectedSetId =
      selectedSetId === setId ? nextRawSets[0].id : selectedSetId;
    const saved = saveQuizStorage(nextRawSets, nextSelectedSetId, questionLimit);
    const temporaryReport = createImportReport(nextRawSets);

    setRawSets(nextRawSets);
    setSelectedSetId(nextSelectedSetId);
    setSession(null);
    setCurrentIndex(0);
    setHasSavedData(saved);
    setImportStatus(
      `Đã xóa "${targetSet.title}". Còn ${temporaryReport.fileCount} bộ đề, tổng ${temporaryReport.parsedQuestionCount} câu. ${
        saved ? 'Thay đổi đã được lưu trên trình duyệt hiện tại.' : ''
      }`
    );
  };

  const loadLearningNote = async (question: Question, force = false) => {
    const existing = learningNotes[question.id];
    if (!force && (existing?.status === 'loading' || existing?.status === 'ready')) {
      return;
    }

    const correctAnswer = question.options.find((option) => option.isCorrect);
    if (!correctAnswer) return;

    const keywords = extractLearningKeywords(question.text, correctAnswer.text);
    setLearningNotes((current) => ({
      ...current,
      [question.id]: {
        status: 'loading',
        keywords,
        questionVi: current[question.id]?.questionVi || '',
        correctAnswerVi: current[question.id]?.correctAnswerVi || '',
      },
    }));

    try {
      const [questionVi, correctAnswerVi] = await Promise.all([
        translateEnglishToVietnamese(question.text),
        translateEnglishToVietnamese(correctAnswer.text),
      ]);

      setLearningNotes((current) => ({
        ...current,
        [question.id]: {
          status: 'ready',
          keywords,
          questionVi,
          correctAnswerVi,
        },
      }));
    } catch (error) {
      setLearningNotes((current) => ({
        ...current,
        [question.id]: {
          status: 'error',
          keywords,
          questionVi: '',
          correctAnswerVi: '',
          errorMessage:
            error instanceof Error
              ? `${error.message}. Hãy kiểm tra Internet rồi bấm “Dịch lại”.`
              : 'Chưa dịch được nội dung. Hãy kiểm tra Internet rồi thử lại.',
        },
      }));
    }
  };

  const selectAnswer = (questionId: string, optionId: string) => {
    if (!session || session.answers[questionId]) return;

    const answeredQuestion = session.questions.find(
      (question) => question.id === questionId
    );

    setSession({
      ...session,
      answers: { ...session.answers, [questionId]: optionId },
    });

    if (answeredQuestion) void loadLearningNote(answeredQuestion);
  };

  const submitQuiz = () => {
    if (!session) return;
    setSession({ ...session, submitted: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetToHome = () => {
    setSession(null);
    setCurrentIndex(0);
  };

  if (isLoadingDefaults) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-100">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Đang tải bộ đề...</h1>
          <p className="mt-3 leading-7 text-slate-400">{importStatus}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 shadow-2xl md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.35fr_0.85fr] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
                  <Shuffle className="h-4 w-4" /> Trộn câu hỏi & trộn đáp án mỗi
                  lượt làm bài
                </div>
                <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                  CCBA Practice Quiz
                </h1>
               

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-100">
                        Dữ liệu câu hỏi
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {importStatus}
                      </p>
                   
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
                        <FileUp className="h-4 w-4" /> Import file .txt
                        <input
                          type="file"
                          accept=".txt,text/plain"
                          multiple
                          className="hidden"
                          onChange={(event) => importFiles(event.target.files)}
                        />
                      </label>
                      <button
                        onClick={resetToDefaultData}
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
                      >
                        Khôi phục 9 bộ mặc định
                      </button>
                    </div>
                  </div>
                </div>

                {importReport.warnings.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                    <div className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        {importReport.warnings.slice(0, 3).map((warning) => (
                          <p key={warning}>{warning}</p>
                        ))}
                        {importReport.warnings.length > 3 && (
                          <p>
                            Còn {importReport.warnings.length - 3} cảnh báo
                            khác.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <StatCard
                    icon={<BookOpen className="h-5 w-5" />}
                    label="Bộ đề riêng"
                    value={String(rawSets.length)}
                  />
                  <StatCard
                    icon={<Layers3 className="h-5 w-5" />}
                    label="Bộ tổng hợp"
                    value="1"
                  />
                  <StatCard
                    icon={<ListChecks className="h-5 w-5" />}
                    label="Tổng câu hỏi"
                    value={String(importReport.parsedQuestionCount)}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
                <h2 className="text-lg font-semibold">
                  Thiết lập lượt làm bài
                </h2>
                <label className="mt-4 block text-sm text-slate-300">
                  Số câu trong lượt học
                </label>
                <select
                  value={questionLimit}
                  onChange={(event) => setQuestionLimit(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none ring-cyan-400/40 focus:ring-4"
                >
                  <option value="10">10 câu</option>
                  <option value="20">20 câu</option>
                  <option value="30">30 câu</option>
                  <option value="50">50 câu</option>
                  <option value="100">100 câu</option>
                  <option value="all">Tất cả câu trong bộ</option>
                </select>

                <button
                  onClick={() => startQuiz(selectedSet?.id)}
                  disabled={!selectedSet || selectedSet.questions.length === 0}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-4 font-semibold text-slate-950 shadow-lg shadow-cyan-950/40 transition hover:-translate-y-0.5 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Bắt đầu bộ đang chọn <ArrowRight className="h-5 w-5" />
                </button>
                <p className="mt-3 text-sm text-slate-400">
                  Bộ đang chọn:{' '}
                  <span className="text-slate-200">{selectedSet?.title}</span>
                </p>
              </div>
            </div>
          </section>

          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Danh sách bộ trắc nghiệm</h2>
              <p className="mt-1 text-slate-400">
                Mỗi file .txt là 1 bộ riêng, cộng thêm 1 bộ cuối tổng hợp.
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm bộ đề..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-slate-100 outline-none ring-cyan-400/40 placeholder:text-slate-500 focus:ring-4"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredSets.map((set, index) => (
              <div
                key={set.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedSetId(set.id);
                  startQuiz(set.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedSetId(set.id);
                    startQuiz(set.id);
                  }
                }}
                className={cn(
                  'group rounded-3xl border p-5 text-left shadow-xl transition hover:-translate-y-1',
                  selectedSetId === set.id
                    ? 'border-cyan-300/70 bg-cyan-300/10 shadow-cyan-950/30'
                    : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.07]'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-semibold text-cyan-100">
                    {set.id === 'all'
                      ? `Bộ ${rawSets.length + 1}`
                      : `Bộ ${index + 1}`}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-slate-950/70 px-3 py-1 text-sm text-slate-300">
                      {set.questions.length} câu
                    </div>

                    {set.id !== 'all' && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void deleteQuizSet(set.id);
                        }}
                        className="rounded-full border border-rose-300/30 bg-rose-300/10 p-2 text-rose-200 transition hover:bg-rose-300 hover:text-rose-950"
                        title="Xóa bộ đề này"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="mt-4 text-lg font-semibold leading-6 text-slate-100">
                  {set.title}
                </h3>
                <p className="mt-2 text-sm text-slate-400">{set.fileName}</p>
                <p className="mt-1 text-sm text-slate-500">{set.description}</p>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    Bấm 1 lần để bắt đầu làm đề
                  </span>
                  <ArrowRight className="h-4 w-4 text-cyan-200 transition group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = session.questions[currentIndex];
  const answeredCount = Object.keys(session.answers).length;
  const progress = Math.round((answeredCount / session.questions.length) * 100);
  const currentPickedId = session.answers[currentQuestion.id];
  const currentPickedOption = currentQuestion.options.find(
    (option) => option.id === currentPickedId
  );
  const currentCorrectOption = currentQuestion.options.find(
    (option) => option.isCorrect
  );
  const currentCorrectIndex = currentQuestion.options.findIndex(
    (option) => option.isCorrect
  );
  const currentCorrectLabel =
    currentCorrectIndex >= 0 ? ANSWER_LABELS[currentCorrectIndex] : '';
  const hasAnsweredCurrent = Boolean(currentPickedId);
  const currentAnswerIsCorrect = Boolean(currentPickedOption?.isCorrect);
  const currentLearningNote = learningNotes[currentQuestion.id];
  const currentKeywords =
    currentLearningNote?.keywords ||
    (hasAnsweredCurrent && currentCorrectOption
      ? extractLearningKeywords(currentQuestion.text, currentCorrectOption.text)
      : []);

  const goToQuestion = (nextIndex: number) => {
    const safeIndex = Math.max(
      0,
      Math.min(session.questions.length - 1, nextIndex)
    );

    setCurrentIndex(safeIndex);
    scrollToPageTop();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1180px] px-2.5 py-2 md:px-3">
        <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <button
              onClick={resetToHome}
              className="mb-1 inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Về danh sách bộ đề
            </button>
            <h1 className="truncate text-base font-bold md:text-lg">
              {session.setTitle}
            </h1>
            <p className="mt-0.5 text-xs text-slate-400">
              Đã chọn {answeredCount}/{session.questions.length} câu · Tiến độ {progress}%
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              onClick={() => startQuiz(session.setId)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Làm lại & trộn mới
            </button>
            <button
              onClick={submitQuiz}
              disabled={session.submitted}
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trophy className="h-3.5 w-3.5" /> Nộp bài
            </button>
          </div>
        </div>

        {session.submitted && (
          <section className="mb-3 flex flex-col gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 shadow-xl sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                Kết quả
              </p>
              <h2 className="text-xl font-bold">
                {score.correct}/{score.total} câu đúng · {score.percent}%
              </h2>
              <p className="text-xs text-slate-300">
                Còn {score.unanswered} câu chưa chọn.
              </p>
            </div>
            <button
              onClick={() => startQuiz(session.setId)}
              className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-100"
            >
              Làm lại bộ này
            </button>
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_232px]">
          <main className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-xl md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div>
                <p className="text-xs font-semibold text-slate-300">
                  Câu {currentIndex + 1}/{session.questions.length}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Nguồn: {currentQuestion.sourceTitle} · Câu gốc {currentQuestion.originalNumber}
                </p>
              </div>
              <div className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                !hasAnsweredCurrent && 'bg-white/10 text-slate-300',
                hasAnsweredCurrent && currentAnswerIsCorrect && 'bg-emerald-300/15 text-emerald-200',
                hasAnsweredCurrent && !currentAnswerIsCorrect && 'bg-rose-300/15 text-rose-200'
              )}>
                {hasAnsweredCurrent
                  ? currentAnswerIsCorrect
                    ? 'Đã chọn · Đúng'
                    : 'Đã chọn · Sai'
                  : 'Chưa chọn'}
              </div>
            </div>

            <h2 className="mt-5 whitespace-pre-line text-base font-semibold leading-7 md:text-[17px] md:leading-7">
              {hasAnsweredCurrent
                ? highlightLearningKeywords(currentQuestion.text, currentKeywords)
                : currentQuestion.text}
            </h2>

            {hasAnsweredCurrent && currentLearningNote && (
              <LearningNotePanel
                note={currentLearningNote}
                onRetry={() => void loadLearningNote(currentQuestion, true)}
              />
            )}

            <div className="mt-5 grid gap-2.5">
              {currentQuestion.options.map((option, optionIndex) => {
                const selected =
                  session.answers[currentQuestion.id] === option.id;
                const showCorrect =
                  (session.submitted || hasAnsweredCurrent) && option.isCorrect;
                const showWrong =
                  (session.submitted || hasAnsweredCurrent) &&
                  selected &&
                  !option.isCorrect;

                return (
                  <button
                    key={option.id}
                    onClick={() => selectAnswer(currentQuestion.id, option.id)}
                    disabled={hasAnsweredCurrent || session.submitted}
                    className={cn(
                      'flex min-h-[58px] items-center gap-3 rounded-2xl border px-3.5 py-3 text-left text-sm transition disabled:cursor-default',
                      selected &&
                        !session.submitted &&
                        'border-cyan-300 bg-cyan-300/10',
                      !selected &&
                        !session.submitted &&
                        !hasAnsweredCurrent &&
                        'border-white/10 bg-slate-900/70 hover:border-white/30 hover:bg-white/10',
                      showCorrect && 'border-emerald-300 bg-emerald-300/10',
                      showWrong && 'border-rose-300 bg-rose-300/10',
                      (session.submitted || hasAnsweredCurrent) &&
                        !showCorrect &&
                        !showWrong &&
                        'border-white/10 bg-slate-900/60 opacity-75'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                        showCorrect
                          ? 'bg-emerald-300 text-emerald-950'
                          : showWrong
                          ? 'bg-rose-300 text-rose-950'
                          : selected
                          ? 'bg-cyan-300 text-slate-950'
                          : 'bg-white/10 text-slate-200'
                      )}
                    >
                      {ANSWER_LABELS[optionIndex]}
                    </span>
                    <span className="flex-1 whitespace-pre-line leading-5 text-slate-100">
                      {option.text}
                    </span>
                    {showCorrect && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                    )}
                    {showWrong && (
                      <XCircle className="h-4 w-4 shrink-0 text-rose-300" />
                    )}
                  </button>
                );
              })}
            </div>

            {hasAnsweredCurrent && (
              <BabokStudyGuidePanel
                question={currentQuestion}
                note={currentLearningNote}
                selectedOptionId={currentPickedId}
              />
            )}

            <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/10 pt-4">
              <button
                onClick={() => goToQuestion(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Câu trước
              </button>
              <div className="hidden text-center text-[11px] text-slate-500 sm:block">
                Đáp án được xáo trộn riêng cho lượt làm bài
              </div>
              <button
                onClick={() => goToQuestion(currentIndex + 1)}
                disabled={currentIndex === session.questions.length - 1}
                className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Câu tiếp
              </button>
            </div>
          </main>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-xl lg:sticky lg:top-3 lg:h-fit">
            <h3 className="text-sm font-semibold">Bảng câu hỏi</h3>
            <div className="mt-2 grid max-h-[calc(100vh-185px)] grid-cols-5 gap-1.5 overflow-auto pr-1">
              {session.questions.map((question, index) => {
                const picked = session.answers[question.id];
                const correct = question.options.find(
                  (option) => option.id === picked
                )?.isCorrect;
                return (
                  <button
                    key={question.id}
                    onClick={() => goToQuestion(index)}
                    className={cn(
                      'h-8 rounded-lg text-xs font-semibold transition',
                      index === currentIndex && 'ring-2 ring-cyan-300',
                      !session.submitted &&
                        picked &&
                        correct &&
                        'bg-emerald-300 text-emerald-950',
                      !session.submitted &&
                        picked &&
                        !correct &&
                        'bg-rose-300 text-rose-950',
                      !session.submitted &&
                        !picked &&
                        'bg-white/10 text-slate-300 hover:bg-white/20',
                      session.submitted &&
                        correct &&
                        'bg-emerald-300 text-emerald-950',
                      session.submitted &&
                        picked &&
                        !correct &&
                        'bg-rose-300 text-rose-950',
                      session.submitted &&
                        !picked &&
                        'bg-slate-800 text-slate-400'
                    )}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 lg:block lg:space-y-1.5">
              <p>
                <span className="inline-block h-2.5 w-2.5 rounded bg-white/10 align-middle" />{' '}
                Chưa làm
              </p>
              <p>
                <span className="inline-block h-2.5 w-2.5 rounded bg-emerald-300 align-middle" />{' '}
                Đúng
              </p>
              <p>
                <span className="inline-block h-2.5 w-2.5 rounded bg-rose-300 align-middle" />{' '}
                Sai
              </p>
            </div>
          </aside>
        </div>

        {session.submitted && (
          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-7">
            <h2 className="text-2xl font-bold">Rà soát đáp án</h2>
            <div className="mt-5 space-y-4">
              {session.questions.map((question, index) => {
                const pickedId = session.answers[question.id];
                const picked = question.options.find(
                  (option) => option.id === pickedId
                );
                const correct = question.options.find(
                  (option) => option.isCorrect
                );
                const isCorrect = Boolean(picked?.isCorrect);

                return (
                  <details
                    key={question.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                    open={!isCorrect}
                  >
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-start gap-3">
                        {isCorrect ? (
                          <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-300" />
                        ) : (
                          <XCircle className="mt-1 h-5 w-5 shrink-0 text-rose-300" />
                        )}
                        <div>
                          <p className="font-semibold leading-7">
                            Câu {index + 1}: {question.text}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            Nguồn: {question.sourceTitle} · Câu gốc{' '}
                            {question.originalNumber}
                          </p>
                        </div>
                      </div>
                    </summary>
                    <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm leading-7">
                      <p>
                        Đáp án bạn chọn:{' '}
                        <span
                          className={
                            isCorrect ? 'text-emerald-300' : 'text-rose-300'
                          }
                        >
                          {picked?.text || 'Chưa chọn'}
                        </span>
                      </p>
                      <p>
                        Đáp án đúng:{' '}
                        <span className="text-emerald-300">
                          {correct?.text}
                        </span>
                      </p>
                    </div>
                    {pickedId && learningNotes[question.id] && (
                      <LearningNotePanel
                        note={learningNotes[question.id]}
                        onRetry={() => void loadLearningNote(question, true)}
                      />
                    )}
                    {pickedId && (
                      <BabokStudyGuidePanel
                        question={question}
                        note={learningNotes[question.id]}
                        selectedOptionId={pickedId}
                        compact
                      />
                    )}
                  </details>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
