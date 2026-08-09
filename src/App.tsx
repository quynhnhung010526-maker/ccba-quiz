{question.id}import React, { useEffect, useMemo, useState } from 'react';
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
  Sun,
  Moon,
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
  sourceFileName: string;
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
const THEME_STORAGE_KEY = 'ccba-practice-theme-v1';

const LIGHT_THEME_OVERRIDES = `
  .app-theme.theme-light {
    background-color: #f1f5f9 !important;
    color: #0f172a !important;
    color-scheme: light;
  }

  .app-theme.theme-dark {
    color-scheme: dark;
  }

  .theme-light [class~="bg-gradient-to-br"] {
    background-image: linear-gradient(to bottom right, #ffffff, #f8fafc, #e2e8f0) !important;
  }

  .theme-light [class~="bg-slate-950"] {
    background-color: #f8fafc !important;
  }

  .theme-light [class~="bg-slate-950/35"],
  .theme-light [class~="bg-slate-950/45"],
  .theme-light [class~="bg-slate-950/70"] {
    background-color: rgba(255, 255, 255, 0.92) !important;
  }

  .theme-light [class~="bg-slate-900/60"],
  .theme-light [class~="bg-slate-900/70"],
  .theme-light [class~="bg-slate-800"] {
    background-color: #f8fafc !important;
  }

  .theme-light [class~="bg-white/[0.04]"],
  .theme-light [class~="bg-white/5"] {
    background-color: rgba(255, 255, 255, 0.9) !important;
  }

  .theme-light [class~="bg-white/10"] {
    background-color: #e2e8f0 !important;
  }

  .theme-light [class~="text-slate-100"],
  .theme-light [class~="text-slate-200"] {
    color: #0f172a !important;
  }

  .theme-light [class~="text-slate-300"] {
    color: #334155 !important;
  }

  .theme-light [class~="text-slate-400"] {
    color: #475569 !important;
  }

  .theme-light [class~="text-slate-500"],
  .theme-light [class~="placeholder:text-slate-500"]::placeholder {
    color: #64748b !important;
  }

  .theme-light [class~="text-cyan-100"],
  .theme-light [class~="text-cyan-200"],
  .theme-light [class~="text-cyan-300"],
  .theme-light [class~="text-cyan-300/70"] {
    color: #0e7490 !important;
  }

  .theme-light [class~="text-amber-100"],
  .theme-light [class~="text-amber-200"] {
    color: #92400e !important;
  }

  .theme-light [class~="text-rose-100"],
  .theme-light [class~="text-rose-100/80"],
  .theme-light [class~="text-rose-200"],
  .theme-light [class~="text-rose-300"] {
    color: #be123c !important;
  }

  .theme-light [class~="text-emerald-200"],
  .theme-light [class~="text-emerald-300"] {
    color: #047857 !important;
  }

  .theme-light [class~="border-white/10"] {
    border-color: #cbd5e1 !important;
  }

  .theme-light [class~="hover:border-white/25"]:hover,
  .theme-light [class~="hover:border-white/30"]:hover {
    border-color: #94a3b8 !important;
  }

  .theme-light [class~="hover:bg-white/10"]:hover,
  .theme-light [class~="hover:bg-white/20"]:hover,
  .theme-light [class~="hover:bg-white/[0.07]"]:hover {
    background-color: #e2e8f0 !important;
  }

  .theme-light [class~="hover:text-white"]:hover {
    color: #0f172a !important;
  }

  .theme-light [class~="bg-white"][class~="text-slate-950"] {
    background-color: #0f172a !important;
    color: #ffffff !important;
  }

  .theme-light [class~="bg-white"][class~="text-slate-950"]:hover {
    background-color: #1e293b !important;
    color: #ffffff !important;
  }

  .theme-light input,
  .theme-light select {
    color-scheme: light;
  }
`;

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


// Hai file dữ liệu BABOK đặt trong thư mục public/.
const BABOK_SECTIONS_PUBLIC_FILE = 'babok-sections.json';
const QUESTION_BABOK_MAP_PUBLIC_FILE = 'question-babok-map.json';

type BabokSectionsPublicData = {
  topics: BabokTopic[];
  sectionBookPages: Record<string, number>;
};

async function loadBabokPublicData(): Promise<void> {
  const [sectionsResponse, questionMapResponse] = await Promise.all([
    fetch(publicFilePath(BABOK_SECTIONS_PUBLIC_FILE), { cache: 'no-store' }),
    fetch(publicFilePath(QUESTION_BABOK_MAP_PUBLIC_FILE), { cache: 'no-store' }),
  ]);

  if (!sectionsResponse.ok) {
    throw new Error(`Không tải được ${BABOK_SECTIONS_PUBLIC_FILE}`);
  }

  if (!questionMapResponse.ok) {
    throw new Error(`Không tải được ${QUESTION_BABOK_MAP_PUBLIC_FILE}`);
  }

  const sectionsData = (await sectionsResponse.json()) as BabokSectionsPublicData;
  const questionMapData = (await questionMapResponse.json()) as Record<
    string,
    Record<number, string>
  >;

  if (!Array.isArray(sectionsData.topics)) {
    throw new Error(`${BABOK_SECTIONS_PUBLIC_FILE} không có mảng topics hợp lệ`);
  }

  BABOK_TOPICS = sectionsData.topics;
  BABOK_SECTION_BOOK_PAGES = sectionsData.sectionBookPages || {};
  BABOK_QUESTION_ROUTES = questionMapData || {};
}

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

let BABOK_TOPICS: BabokTopic[] = [];

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


let BABOK_QUESTION_ROUTES: Record<string, Record<number, string>> = {};

let BABOK_SECTION_BOOK_PAGES: Record<string, number> = {};

function findBabokTopicBySection(section: string): BabokTopic | undefined {
  return BABOK_TOPICS.find((topic) => topic.section === section);
}

function baseTopicSectionForRoute(routeSection: string): string {
  if (/^Chapter\s+/i.test(routeSection)) return routeSection;

  const numericParts = routeSection.match(/^([0-9]+)\.([0-9]+)/);
  if (!numericParts) return routeSection;

  const baseSection = `${numericParts[1]}.${numericParts[2]}`;
  if (findBabokTopicBySection(baseSection)) return baseSection;

  return `Chapter ${numericParts[1]}`;
}

function detectQuestionSetKey(question: Question): string | null {
  // question-babok-map.json được tổ chức theo BỘ CÂU HỎI (1..9),
  // không phải theo số Chapter/Knowledge Area của BABOK.
  // Ưu tiên fileName vì vẫn hoạt động khi người dùng import lại các file CCBA*.txt.
  const fileMatch = question.sourceFileName.match(/(?:^|[^a-z0-9])ccba\s*0?([1-9])(?:[^0-9]|$)/i);
  if (fileMatch) return fileMatch[1];

  // Các bộ mặc định dùng id default-1 ... default-9.
  const defaultIdMatch = question.sourceSetId.match(/^default-([1-9])$/i);
  if (defaultIdMatch) return defaultIdMatch[1];

  // Fallback cho trường hợp title được đặt theo dạng "Bộ 1" / "Set 1".
  const titleMatch = question.sourceTitle.match(/\b(?:bộ|bo|set)\s*0?([1-9])\b/i);
  if (titleMatch) return titleMatch[1];

  return null;
}

function knownQuestionRoute(question: Question): string | null {
  const questionSetKey = detectQuestionSetKey(question);
  if (!questionSetKey) return null;

  return (
    BABOK_QUESTION_ROUTES[questionSetKey]?.[question.originalNumber] || null
  );
}

function isSpecificBabokAlias(alias: string): boolean {
  const normalized = normalizeBabokMatchText(alias);
  return normalized.length >= 5 && !BABOK_GENERIC_ALIASES.has(normalized);
}

function answerMatchesTopic(answerText: string, topic: BabokTopic): boolean {
  const answer = normalizeBabokMatchText(answerText);
  if (!answer) return false;

  return [topic.titleEn, ...topic.aliases].some((alias) => {
    if (!isSpecificBabokAlias(alias)) return false;
    const normalizedAlias = normalizeBabokMatchText(alias);
    return (
      answer === normalizedAlias ||
      (normalizedAlias.length >= 8 && answer.includes(normalizedAlias))
    );
  });
}

function resolveStrongBabokTopic(question: Question): BabokTopic | undefined {
  const correctAnswer =
    question.options.find((option) => option.isCorrect)?.text || '';
  const questionNormalized = normalizeBabokMatchText(question.text);

  const asksForTask =
    /\b(which|what)\b.{0,50}\btask\b|during which task|task is|what task|which knowledge area/i.test(
      question.text
    );
  const asksForTechnique =
    /\b(which|what)\b.{0,55}\btechnique\b|best suited|most suitable|which diagram|which matrix|what approach/i.test(
      question.text
    );
  const asksForKnowledgeArea =
    /which knowledge area|knowledge area does|task in which of the following knowledge areas/i.test(
      question.text
    );
  const asksForTerm =
    /what term describes|best be described as what|which type of requirement|which type of stakeholder/i.test(
      question.text
    );

  if (asksForTask) {
    const answerTask = BABOK_TOPICS.find(
      (topic) =>
        topic.kind === 'task' && answerMatchesTopic(correctAnswer, topic)
    );
    if (answerTask) return answerTask;
  }

  if (asksForKnowledgeArea) {
    const answerChapter = BABOK_TOPICS.find(
      (topic) =>
        topic.kind === 'chapter' && answerMatchesTopic(correctAnswer, topic)
    );
    if (answerChapter) return answerChapter;
  }

  const explicitlyNamedTask = BABOK_TOPICS
    .filter((topic) => topic.kind === 'task')
    .filter((topic) =>
      questionNormalized.includes(normalizeBabokMatchText(topic.titleEn))
    )
    .sort((left, right) => right.titleEn.length - left.titleEn.length)[0];

  if (explicitlyNamedTask) return explicitlyNamedTask;

  if (asksForTechnique) {
    const answerTechnique = BABOK_TOPICS.find(
      (topic) =>
        topic.kind === 'technique' && answerMatchesTopic(correctAnswer, topic)
    );
    if (answerTechnique) return answerTechnique;
  }

  const explicitlyNamedTechnique = BABOK_TOPICS
    .filter((topic) => topic.kind === 'technique')
    .filter((topic) =>
      questionNormalized.includes(normalizeBabokMatchText(topic.titleEn))
    )
    .sort((left, right) => right.titleEn.length - left.titleEn.length)[0];

  if (
    explicitlyNamedTechnique &&
    /purpose|element|component|advantage|disadvantage|difference|usage|used for|describ/i.test(
      question.text
    )
  ) {
    return explicitlyNamedTechnique;
  }

  if (asksForTerm) {
    const answerTopic = BABOK_TOPICS
      .filter((topic) => topic.kind !== 'chapter')
      .find((topic) => answerMatchesTopic(correctAnswer, topic));
    if (answerTopic) return answerTopic;
  }

  return undefined;
}

function focusNameForSection(section: string, fallback: BabokFocus): string {
  if (/\.1$/.test(section)) return 'Mục đích';
  if (/\.2$/.test(section)) return 'Mô tả';
  if (/\.3$/.test(section)) return /^10\./.test(section) ? 'Các thành phần' : 'Đầu vào';
  if (/\.4$/.test(section)) return /^10\./.test(section) ? 'Lưu ý sử dụng' : 'Các yếu tố';
  if (/\.5$/.test(section)) return 'Guidelines and Tools';
  if (/\.6$/.test(section)) return 'Các kỹ thuật';
  if (/\.7$/.test(section)) return 'Các bên liên quan';
  if (/\.8$/.test(section)) return 'Đầu ra';
  return fallback.focusName;
}

function applyKnownRouteFocus(
  routeSection: string | null,
  fallback: BabokFocus
): BabokFocus {
  if (!routeSection || /^Chapter\s+/i.test(routeSection)) return fallback;

  const routeParts = routeSection.split('.');
  if (routeParts.length < 3) return fallback;

  return {
    sectionLabel: routeSection,
    focusName: focusNameForSection(routeSection, fallback),
    readingGuide: `Đọc trực tiếp mục ${routeSection} trong BABOK để trả lời câu hỏi này.`,
  };
}

function babokBookPageForSection(
  sectionLabel: string,
  fallbackBookPage: number
): number {
  const normalizedSection =
    sectionLabel.match(/^(?:Chapter\s+)?[0-9]+(?:\.[0-9]+)*/i)?.[0] || '';

  if (/^Chapter\s+/i.test(normalizedSection)) return fallbackBookPage;

  return BABOK_SECTION_BOOK_PAGES[normalizedSection] || fallbackBookPage;
}


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
          'Purpose giải thích lý do thực hiện task và value được tạo ra.',
      },
      {
        pattern:
          /\binput\b|\binputs\b|\bprerequisite\b|\brequired before\b|\bneeded before\b/,
        suffix: '.3 Inputs',
        name: 'Đầu vào của task',
        guide:
          'Inputs là thông tin cần có để task bắt đầu.',
      },
      {
        pattern:
          /\boutput\b|\boutputs\b|\bdeliverable\b|\bproduces\b|\bproduced\b|\bdeliver\b|\bresult of the task\b|\bmain output\b/,
        suffix: '.8 Outputs',
        name: 'Đầu ra của task',
        guide:
          'Outputs là kết quả được tạo ra hoặc thay đổi trạng thái sau khi task hoàn tất.',
      },
      {
        pattern:
          /\btechnique\b|\btechniques\b|\bbest suited\b|\bmost suitable\b|\bused during\b|\bapproach would you use\b/,
        suffix: '.6 Techniques',
        name: 'Các kỹ thuật áp dụng',
        guide:
          'Đối chiếu đúng danh sách Techniques được BABOK nêu cho task.',
      },
      {
        pattern:
          /\bstakeholder\b|\bstakeholders\b|\bwho\b|\bparticipate\b|\bresponsible\b|\bconsulted\b/,
        suffix: '.7 Stakeholders',
        name: 'Stakeholder tham gia hoặc bị ảnh hưởng',
        guide:
          'Đọc danh sách stakeholder thường tham gia hoặc bị ảnh hưởng bởi task.',
      },
      {
        pattern:
          /\bguideline\b|\bguidelines\b|\btool\b|\btools\b|\bartifact\b|\breference\b|\bdocument should\b/,
        suffix: '.5 Guidelines and Tools',
        name: 'Guidelines and Tools',
        guide:
          'Guidelines and Tools là nguồn lực hỗ trợ biến inputs thành outputs.',
      },
      {
        pattern:
          /\belement\b|\belements\b|\bkey concept\b|\bconsideration\b|\bcharacteristic\b|\binclude\b|\bcontains?\b|\btypes?\b|\bfactors?\b|\bcriteria\b/,
        suffix: '.4 Elements',
        name: 'Các yếu tố cần hiểu',
        guide:
          'Elements là các khái niệm và nội dung cốt lõi để thực hiện task.',
      },
      {
        pattern: /\bdescription\b|\bdescribes\b|\bwhat is the task\b/,
        suffix: '.2 Description',
        name: 'Mô tả của task',
        guide:
          'Description giải thích task là gì, vì sao thực hiện và cần đạt điều gì.',
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

    if (/\belement\b|\belements\b|\bcomponent\b|\bcharacteristic\b|\btype\b|\btypes\b|\bmethod\b|\bmethods\b|\bcriteria\b/.test(question)) {
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
  if (/\.3\b/.test(section)) {
    return /10\./.test(section) ? 'Elements' : 'Inputs';
  }
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

  const routeSection = knownQuestionRoute(question);
  const routedPrimary = routeSection
    ? findBabokTopicBySection(baseTopicSectionForRoute(routeSection))
    : resolveStrongBabokTopic(question);

  let primary = routedPrimary || ranked[0]?.topic;
  const shouldUseChapterFallback =
    !primary ||
    (!routedPrimary &&
      (ranked[0].score <= 0 || Boolean(sourceChapter && ranked[0].score <= 70)));

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

  const inferredFocus = inferBabokFocus(question.text, primary);
  const focus = applyKnownRouteFocus(routeSection, inferredFocus);
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

function babokPdfEmbedHref(bookPage: number): string {
  return `${babokPdfPublicUrl()}#page=${babokPdfPage(
    bookPage
  )}&zoom=page-width&navpanes=0`;
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
    sourceFileName: set.fileName,
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

type RequirementsArchitectureBabokRow = {
  section: string;
  headingEn: string;
  headingVi: string;
  bodyEn: string;
  bodyVi: string;
};

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
    /purpose|collectively support|work in harmony|single whole|fit together|overall objectives|meaningful whole|organize requirements based on.*solution components/.test(
      text
    )
  ) {
    return 'purpose';
  }

  return 'general';
}

function getRequirementsArchitectureBabokRows(
  pattern: RequirementsArchitecturePattern
): RequirementsArchitectureBabokRow[] {
  const purpose: RequirementsArchitectureBabokRow = {
    section: '7.4.1',
    headingEn: 'Purpose',
    headingVi: 'Mục đích',
    bodyEn:
      'Ensure that the requirements collectively support one another and fully achieve the objectives.',
    bodyVi:
      'Bảo đảm toàn bộ các yêu cầu cùng hỗ trợ lẫn nhau để đạt đầy đủ các mục tiêu.',
  };

  const description: RequirementsArchitectureBabokRow = {
    section: '7.4.2',
    headingEn: 'Requirements Architecture',
    headingVi: 'Kiến trúc yêu cầu',
    bodyEn:
      'The structure of all requirements for a change. It fits models and specifications together as one coherent whole that supports business objectives and useful stakeholder outcomes.',
    bodyVi:
      'Là cấu trúc của toàn bộ yêu cầu cho một thay đổi; ghép các mô hình và đặc tả thành một chỉnh thể thống nhất, hỗ trợ mục tiêu kinh doanh và tạo kết quả hữu ích cho bên liên quan.',
  };

  const architectureVsTraceability: RequirementsArchitectureBabokRow = {
    section: '7.4.2',
    headingEn: 'Architecture versus Traceability',
    headingVi: 'Phân biệt Architecture và Traceability',
    bodyEn:
      'Architecture shows whether requirements and models work together as a cohesive whole. Traceability shows where a requirement comes from, what it relates to, and how an objective is satisfied.',
    bodyVi:
      'Architecture cho biết các yêu cầu và mô hình có phối hợp thành một chỉnh thể hay không. Traceability cho biết yêu cầu xuất phát từ đâu, liên kết với gì và mục tiêu được đáp ứng như thế nào.',
  };

  const inputs: RequirementsArchitectureBabokRow = {
    section: '7.4.3',
    headingEn: 'Inputs',
    headingVi: 'Đầu vào',
    bodyEn:
      'Information Management Approach; Requirements (any state); Solution Scope.',
    bodyVi:
      'Phương pháp quản lý thông tin; Yêu cầu ở bất kỳ trạng thái nào; Phạm vi giải pháp.',
  };

  const viewpoints: RequirementsArchitectureBabokRow = {
    section: '7.4.4.1',
    headingEn: 'Requirements Viewpoints and Views',
    headingVi: 'Viewpoint và View của yêu cầu',
    bodyEn:
      'A viewpoint defines the conventions for representing, organizing, and relating requirements for a stakeholder group. A view is the actual set of requirements and designs produced from that viewpoint.',
    bodyVi:
      'Viewpoint quy định cách biểu diễn, tổ chức và liên kết yêu cầu cho một nhóm bên liên quan. View là bộ yêu cầu và thiết kế thực tế được tạo ra theo viewpoint đó.',
  };

  const templates: RequirementsArchitectureBabokRow = {
    section: '7.4.4.2',
    headingEn: 'Template Architectures',
    headingVi: 'Kiến trúc mẫu',
    bodyEn:
      'An architectural framework is a standard collection of viewpoints that can be used as a predefined starting template.',
    bodyVi:
      'Architectural framework là tập hợp viewpoint tiêu chuẩn, được dùng như một mẫu có sẵn để bắt đầu xây dựng kiến trúc.',
  };

  const completeness: RequirementsArchitectureBabokRow = {
    section: '7.4.4.3',
    headingEn: 'Completeness',
    headingVi: 'Tính đầy đủ',
    bodyEn:
      'The complete set must tell a cohesive, full story: no requirement is missing, inconsistent, or contradictory, and relevant dependencies are considered.',
    bodyVi:
      'Toàn bộ tập yêu cầu phải tạo thành một câu chuyện đầy đủ và gắn kết: không bị thiếu, không bất nhất, không mâu thuẫn và đã xem xét các quan hệ phụ thuộc liên quan.',
  };

  const relationships: RequirementsArchitectureBabokRow = {
    section: '7.4.4.4',
    headingEn: 'Verify Requirement Relationships',
    headingVi: 'Kiểm tra quan hệ giữa các yêu cầu',
    bodyEn:
      'Each relationship should be Defined, Necessary, Correct, Unambiguous, and Consistent.',
    bodyVi:
      'Mỗi quan hệ phải được xác định rõ, cần thiết, chính xác, không mơ hồ và nhất quán.',
  };

  const informationArchitecture: RequirementsArchitectureBabokRow = {
    section: '7.4.4.5',
    headingEn: 'Business Analysis Information Architecture',
    headingVi: 'Kiến trúc thông tin phân tích nghiệp vụ',
    bodyEn:
      'Defines how requirements, designs, models, and elicitation results relate to one another, helping confirm that the full set of requirements is complete.',
    bodyVi:
      'Xác định cách yêu cầu, thiết kế, mô hình và kết quả khai thác thông tin liên hệ với nhau, qua đó giúp xác nhận toàn bộ tập yêu cầu là đầy đủ.',
  };

  const techniques: RequirementsArchitectureBabokRow = {
    section: '7.4.6',
    headingEn: 'Techniques',
    headingVi: 'Kỹ thuật',
    bodyEn:
      'Data Modelling; Functional Decomposition; Interviews; Organizational Modelling; Scope Modelling; Workshops.',
    bodyVi:
      'Mô hình hóa dữ liệu; Phân rã chức năng; Phỏng vấn; Mô hình hóa tổ chức; Mô hình hóa phạm vi; Hội thảo.',
  };

  const output: RequirementsArchitectureBabokRow = {
    section: '7.4.8',
    headingEn: 'Output: Requirements Architecture',
    headingVi: 'Đầu ra: Kiến trúc yêu cầu',
    bodyEn:
      'The requirements, the interrelationships among them, and any recorded contextual information.',
    bodyVi:
      'Các yêu cầu, các mối quan hệ giữa chúng và mọi thông tin bối cảnh đã được ghi nhận.',
  };

  switch (pattern) {
    case 'traceability':
      return [architectureVsTraceability];
    case 'relationship-quality':
      return [relationships];
    case 'techniques':
      return [techniques];
    case 'viewpoints':
      return [viewpoints, templates];
    case 'completeness':
      return [completeness, informationArchitecture];
    case 'inputs':
      return [inputs];
    case 'output':
      return [output];
    case 'purpose':
      return [purpose, description, architectureVsTraceability];
    case 'general':
    default:
      return [purpose, description];
  }
}

function firstSentence(value: string): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  const match = cleaned.match(/^(.+?[.!?])(?:\s|$)/);
  return match ? match[1].trim() : cleaned;
}

function shortenMemoryText(value: string, maxLength = 210): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

function getRequirementsArchitectureBookPage(
  pattern: RequirementsArchitecturePattern
): number {
  switch (pattern) {
    case 'viewpoints':
      return 149;
    case 'completeness':
      return 150;
    case 'relationship-quality':
      return 151;
    case 'techniques':
    case 'output':
      return 152;
    case 'traceability':
    case 'inputs':
    case 'purpose':
    case 'general':
    default:
      return 148;
  }
}

type MinimalBabokMemory = {
  section: string;
  title: string;
  rememberEn: string;
  rememberVi: string;
  keyEn: string;
  bookPage: number;
};

function getRequirementsArchitectureKeyEnglish(
  pattern: RequirementsArchitecturePattern
): string {
  switch (pattern) {
    case 'traceability':
      return 'cohesive whole · work in harmony · not traceability';
    case 'relationship-quality':
      return 'Defined · Necessary · Correct · Unambiguous · Consistent';
    case 'techniques':
      return 'Data Modelling · Functional Decomposition · Interviews · Organizational Modelling · Scope Modelling · Workshops';
    case 'viewpoints':
      return 'viewpoint = conventions · view = actual requirements and designs';
    case 'completeness':
      return 'complete · cohesive · no missing, inconsistent, or contradictory requirements';
    case 'inputs':
      return 'Information Management Approach · Requirements · Solution Scope';
    case 'output':
      return 'Requirements Architecture';
    case 'purpose':
      return 'collectively support one another · fully achieve the objectives';
    case 'general':
    default:
      return 'single whole · cohesive requirements · overall business objectives';
  }
}

function buildGenericRememberEnglish(
  question: Question,
  guide: BabokStudyGuide
): string {
  const correct = question.options.find((option) => option.isCorrect);
  const answer = correct?.text.trim() || guide.primary.titleEn;
  const normalized = normalizeBabokMatchText(question.text);

  if (/\bnot\b|\bleast\b|\bexcept\b|\bfalse\b|\bincorrect\b/.test(normalized)) {
    return `The exception is: ${answer}.`;
  }
  if (/\binput\b|\binputs\b|\bprerequisite\b|required before/.test(normalized)) {
    return `The required input is: ${answer}.`;
  }
  if (/\boutput\b|\boutputs\b|\bdeliverable\b|\bproduces\b|\bresult\b/.test(normalized)) {
    return `The output is: ${answer}.`;
  }
  if (/\btechnique\b|best suited|most suitable|which diagram|which matrix/.test(normalized)) {
    return `The applicable technique is: ${answer}.`;
  }
  if (/\bstakeholder\b|\bstakeholders\b|\bwho\b|participate|responsible/.test(normalized)) {
    return `The relevant stakeholder is: ${answer}.`;
  }
  if (/purpose|primary goal|goal of|why/.test(normalized)) {
    return `The key purpose is: ${answer}.`;
  }
  return answer.endsWith('.') ? answer : `${answer}.`;
}

function getGenericKeyEnglish(
  question: Question,
  guide: BabokStudyGuide,
  note?: LearningNote
): string {
  const keywordText = note?.keywords
    ?.slice(0, 4)
    .map((item) => item.en)
    .filter(Boolean)
    .join(' · ');

  if (keywordText) return keywordText;

  const correct = question.options.find((option) => option.isCorrect);
  return shortenMemoryText(correct?.text || guide.primary.titleEn, 150);
}

function buildMinimalBabokMemory(
  question: Question,
  guide: BabokStudyGuide,
  note?: LearningNote
): MinimalBabokMemory {
  if (guide.primary.section === '7.4') {
    const pattern = detectRequirementsArchitecturePattern(question);
    const row = getRequirementsArchitectureBabokRows(pattern)[0];

    return {
      section: row.section,
      title: row.headingEn,
      rememberEn: shortenMemoryText(row.bodyEn, 230),
      rememberVi: shortenMemoryText(row.bodyVi, 230),
      keyEn: getRequirementsArchitectureKeyEnglish(pattern),
      bookPage: getRequirementsArchitectureBookPage(pattern),
    };
  }

  const translatedAnswer =
    note?.status === 'ready' && note.correctAnswerVi
      ? note.correctAnswerVi
      : '';
  const topicSummary = firstSentence(guide.primary.summaryVi);

  return {
    section: guide.focus.sectionLabel,
    title: guide.primary.titleEn,
    rememberEn: shortenMemoryText(buildGenericRememberEnglish(question, guide), 230),
    rememberVi: shortenMemoryText(translatedAnswer || topicSummary, 230),
    keyEn: getGenericKeyEnglish(question, guide, note),
    bookPage: babokBookPageForSection(
      guide.focus.sectionLabel,
      getBabokBookPageRange(guide.primary).start
    ),
  };
}

function BabokStudyGuidePanel({
  question,
  note,
  compact = false,
}: {
  question: Question;
  note?: LearningNote;
  selectedOptionId?: string;
  compact?: boolean;
}) {
  const guide = buildBabokStudyGuide(question);
  const memory = buildMinimalBabokMemory(question, guide, note);
  const pdfPage = babokPdfPage(memory.bookPage);
  const pdfHref = babokPdfHref(memory.bookPage);
  const pdfEmbedHref = babokPdfEmbedHref(memory.bookPage);
  const [showVietnameseSummary, setShowVietnameseSummary] = useState(false);

  useEffect(() => {
    setShowVietnameseSummary(false);
  }, [question.id]);

  if (compact) {
    return (
      <section className="mt-3 rounded-xl border border-cyan-300/20 bg-slate-950/35 px-3 py-2.5 text-[11px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 font-semibold text-slate-200">
            <span className="text-cyan-200">BABOK {memory.section}</span>
            {' · '}
            {memory.title}
            {' · '}trang {memory.bookPage}
          </p>
          <a
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-md border border-white/10 px-2 py-1 font-semibold text-cyan-200 transition hover:bg-white/10"
          >
            Xem đúng trang PDF
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-300/25 bg-slate-950/45 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 md:px-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-bold text-cyan-100">
            <BookOpen className="h-4 w-4 shrink-0" />
            Phần BABOK liên quan
          </p>
          <p className="mt-1 truncate text-[11px] text-slate-300 md:text-xs">
            {memory.section} · {memory.title} · trang sách {memory.bookPage} ·
            trang PDF {pdfPage}
          </p>
        </div>
        <a
          href={pdfHref}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-semibold text-cyan-200 transition hover:bg-white/10"
        >
          Mở toàn màn hình
        </a>
      </div>

      <div className="border-b border-white/10 bg-cyan-300/[0.05] px-3 py-3 md:px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">
              Tóm tắt để trả lời
            </p>
            <p className="mt-1.5 text-sm font-medium leading-5 text-slate-100">
              {memory.rememberEn}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowVietnameseSummary((current) => !current)}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-semibold text-cyan-200 transition hover:bg-white/10"
          >
            {showVietnameseSummary ? 'Ẩn bản dịch' : 'Dịch tiếng Việt'}
          </button>
        </div>

        {showVietnameseSummary && (
          <p className="mt-2 border-t border-white/10 pt-2 text-xs leading-5 text-slate-300">
            {memory.rememberVi}
          </p>
        )}

        <p className="mt-2 text-[11px] leading-4 text-slate-400">
          <span className="font-semibold text-slate-300">Key English:</span>{' '}
          {memory.keyEn}
        </p>
      </div>

      <iframe
        key={`${question.id}-${pdfPage}`}
        src={pdfEmbedHref}
        title={`BABOK ${memory.section} - ${memory.title}`}
        loading="lazy"
        className="h-[520px] w-full bg-white lg:h-[calc(100vh-285px)] lg:min-h-[520px] xl:h-[calc(100vh-260px)]"
      />

      <div className="border-t border-white/10 px-3 py-2 text-[10px] text-slate-400 md:px-4">
        Trình duyệt không hiển thị PDF?{' '}
        <a
          href={pdfHref}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-cyan-200 hover:text-cyan-100"
        >
          Bấm để mở đúng trang.
        </a>
      </div>
    </section>
  );
}

function ThemeController({
  isDarkMode,
  onToggle,
}: {
  isDarkMode: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <style>{LIGHT_THEME_OVERRIDES}</style>
      <button
        type="button"
        onClick={onToggle}
        aria-label={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
        title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
        className={cn(
          'fixed bottom-4 right-4 z-[100] inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-2xl backdrop-blur transition hover:-translate-y-0.5',
          isDarkMode
            ? 'border-white/10 bg-slate-900/90 text-slate-100 hover:bg-slate-800'
            : 'border-slate-300 bg-white/95 text-slate-800 hover:bg-slate-100'
        )}
      >
        {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        <span className="hidden sm:inline">
          {isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
        </span>
      </button>
    </>
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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;

    try {
      return window.localStorage.getItem(THEME_STORAGE_KEY) !== 'light';
    } catch {
      return true;
    }
  });
  const [rawSets, setRawSets] = useState<RawSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [questionLimit, setQuestionLimit] = useState('all');
  const [search, setSearch] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [learningNotes, setLearningNotes] = useState<Record<string, LearningNote>>({});
  const [hasSavedData, setHasSavedData] = useState(false);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);
  const [isLoadingBabokData, setIsLoadingBabokData] = useState(true);
  const [babokDataError, setBabokDataError] = useState('');
  const [importStatus, setImportStatus] = useState(
    'Đang tải 9 bộ đề mặc định từ thư mục public...'
  );

  const toggleTheme = () => {
    setIsDarkMode((current) => {
      const next = !current;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
        } catch {
          // Vẫn đổi giao diện trong phiên hiện tại nếu trình duyệt chặn localStorage.
        }
      }
      return next;
    });
  };

  const appThemeClass = (baseClassName: string) =>
    cn(
      baseClassName,
      'app-theme',
      isDarkMode ? 'theme-dark' : 'theme-light'
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
    let isActive = true;

    void loadBabokPublicData()
      .then(() => {
        if (!isActive) return;
        setBabokDataError('');
        setIsLoadingBabokData(false);
      })
      .catch((error) => {
        if (!isActive) return;
        setBabokDataError(
          error instanceof Error ? error.message : 'Không tải được dữ liệu BABOK.'
        );
        setIsLoadingBabokData(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

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

  useEffect(() => {
    if (!session) return;

    const handleEnterToNext = (event: KeyboardEvent) => {
      if (
        event.key !== 'Enter' ||
        event.repeat ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName || '';
      if (
        target?.isContentEditable ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        tagName === 'BUTTON' ||
        tagName === 'A'
      ) {
        return;
      }

      const activeQuestion = session.questions[currentIndex];
      if (!activeQuestion) return;

      const hasAnswered = Boolean(session.answers[activeQuestion.id]);
      if (!hasAnswered && !session.submitted) return;
      if (currentIndex >= session.questions.length - 1) return;

      event.preventDefault();
      setCurrentIndex((index) =>
        Math.min(session.questions.length - 1, index + 1)
      );

      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        });
      }
    };

    window.addEventListener('keydown', handleEnterToNext);
    return () => window.removeEventListener('keydown', handleEnterToNext);
  }, [session, currentIndex]);

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

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

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
      <div className={appThemeClass('flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100')}>
        <ThemeController isDarkMode={isDarkMode} onToggle={toggleTheme} />
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

  if (isLoadingBabokData) {
    return (
      <div className={appThemeClass('flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100')}>
        <ThemeController isDarkMode={isDarkMode} onToggle={toggleTheme} />
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-cyan-200" />
          <p className="mt-3 text-sm text-slate-300">Đang tải dữ liệu BABOK...</p>
        </div>
      </div>
    );
  }

  if (babokDataError) {
    return (
      <div className={appThemeClass('flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100')}>
        <ThemeController isDarkMode={isDarkMode} onToggle={toggleTheme} />
        <div className="max-w-xl rounded-2xl border border-rose-300/30 bg-rose-300/10 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-200" />
            <div>
              <h1 className="font-bold text-rose-100">Không tải được dữ liệu BABOK</h1>
              <p className="mt-2 text-sm text-rose-100/80">{babokDataError}</p>
              <p className="mt-3 text-sm text-slate-300">
                Kiểm tra hai file public/{BABOK_SECTIONS_PUBLIC_FILE} và public/{QUESTION_BABOK_MAP_PUBLIC_FILE}.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={appThemeClass('min-h-screen bg-slate-950 text-slate-100')}>
        <ThemeController isDarkMode={isDarkMode} onToggle={toggleTheme} />
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
    <div className={appThemeClass('min-h-screen bg-slate-950 text-slate-100')}>
      <ThemeController isDarkMode={isDarkMode} onToggle={toggleTheme} />
      <div className="mx-auto max-w-[1880px] px-2.5 py-2 md:px-3">
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

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(330px,0.95fr)_210px] lg:items-start xl:grid-cols-[minmax(0,1.8fr)_minmax(380px,1fr)_220px]">
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
                Câu tiếp <span className="ml-1 text-[10px] opacity-60">Enter</span>
              </button>
            </div>
          </main>

          <section className="min-w-0 lg:sticky lg:top-3 lg:max-h-[calc(100vh-24px)]">
            {hasAnsweredCurrent ? (
              <BabokStudyGuidePanel
                question={currentQuestion}
                note={currentLearningNote}
                selectedOptionId={currentPickedId}
              />
            ) : (
              <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-cyan-300/20 bg-white/[0.04] p-5 text-center shadow-xl lg:min-h-[calc(100vh-145px)]">
                <div>
                  <BookOpen className="mx-auto h-8 w-8 text-cyan-300/70" />
                  <h3 className="mt-3 text-sm font-semibold text-slate-200">
                    Tóm tắt và BABOK
                  </h3>
                  <p className="mt-1.5 text-xs leading-5 text-slate-400">
                    Chọn một đáp án để hiện phần tóm tắt và đúng trang PDF liên quan.
                  </p>
                </div>
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-xl lg:sticky lg:top-3 lg:h-fit">
            <h3 className="text-sm font-semibold">Theo dõi tiến độ</h3>
            <div className="mt-2 grid max-h-[calc(100vh-245px)] grid-cols-5 gap-1.5 overflow-auto pr-1">
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
