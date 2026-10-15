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
  sourceOrdinal: number;
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

type ExcelTechnique = {
  name: string;
  purpose: string;
  source: string;
  keyLearning?: PracticalKeyInsight;
};
type ExcelMemory = {
  section: string;
  note: string;
  mnemonic: string;
  source: string;
};
type ExcelDictionaryTerm = { en: string; vi: string };
type StudyParagraphBlock = {
  type: 'paragraph' | 'insight' | 'tip' | 'answer' | 'process';
  text?: string;
  steps?: string[];
};
type AnswerOptionExplanation = { text: string; why: string };
type QuestionStudyBlocks = {
  recognition: StudyParagraphBlock[];
  foundation: StudyParagraphBlock[];
  confusion?: StudyParagraphBlock[];
};
type CuratedQuestionInsight = {
  anchor: string;
  correctAnswer: string;
  studyBlocks?: QuestionStudyBlocks;
  optionReasons?: AnswerOptionExplanation[];
  keyPhrasesInQuestion?: string[];
  sourceEvidence?: Array<{ label: string; claim: string }>;
  sourceQualification?: string;
  contentFormat?: string;
  clue: string;
  principle: string;
  contrast: string;
  source: string;
  reviewStatus?: string;
  coverageLevel?: 'existing' | 'rule' | 'named' | 'supported' | 'context' | 'gap';
  sourceOrdinal?: number;
  originalNumber?: number;
  matchScore?: number;
  reviewedByHuman?: boolean;
  evidence?: {
    source: string | null;
    excerpt?: string;
    route?: string;
    directSupport: boolean;
    matchMethod?: string;
  };
};
type ExcelExamRule = {
  answerPattern: string;
  answerFlags?: string;
  questionPattern: string;
  questionFlags?: string;
  clue: string;
  principle: string;
  contrast: string;
};
type ExcelTask = { section: string; name: string; purpose: string; elements?: string; inputs?: string; outputs?: string; source: string; keyLearning?: PracticalKeyInsight };
type ExcelKnowledge = {
  techniques: ExcelTechnique[];
  memorize: ExcelMemory[];
  dictionary: ExcelDictionaryTerm[];
  tasks: ExcelTask[];
  comparison?: Array<{name:string;when:string;people?:string;preparation?:string;result?:string;source:string}>;
  // Lời giải riêng cho câu: key cấp 1 = số file CCBA (1-9), key cấp 2 = số câu gốc hoặc @thứ tự trong file.
  questionExplanations?: Record<string, Record<string, CuratedQuestionInsight>>;
  // Các quy tắc KEY có thể tái sử dụng, nhưng phải kiểm tra điều kiện câu hỏi và đáp án đúng.
  examRules?: ExcelExamRule[];
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
// PDF Study Notes (107 trang): bookPage trong JSON lưu TRANG PDF, không phải trang BABOK gốc.
const BABOK_PDF_PAGE_OFFSET = 0;


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
    Record<string, string>
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


let BABOK_QUESTION_ROUTES: Record<string, Record<string, string>> = {};

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
  // Câu Pre Exam 01/Q73: stakeholder hiểu nghiệp vụ, KHÔNG PHẢI Verify Requirements.
  if (/feasible for the staff who perform/i.test(question.text) &&
      question.options.some(option => option.isCorrect && /domain subject matter expert/i.test(option.text))) {
    return '2.4';
  }
  const questionSetKey = detectQuestionSetKey(question);
  if (!questionSetKey) return null;

  const routes = BABOK_QUESTION_ROUTES[questionSetKey];
  // Khi file có các Question 29/30 trùng số, khóa @<thứ tự câu> được ưu tiên.
  return routes?.[`@${question.sourceOrdinal}`] || routes?.[String(question.originalNumber)] || null;
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
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return `${baseUrl}/?babokPage=${babokPdfPage(bookPage)}`;
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

/** Câu hỏi chỉ tô đúng các KEY đã được sử dụng ở mục Cách nhận diện.
 * Không lấy thuật ngữ ngẫu nhiên từ glossary hay đáp án để tô ở đây. */
function highlightLearningKeywords(
  text: string,
  phrases: string[]
): React.ReactNode {
  const unique = Array.from(new Set(phrases.map(p => p.toLocaleLowerCase())));
  const matched = phrases
    .filter((p, i) => p.trim().length >= 3 && unique.indexOf(p.toLocaleLowerCase()) === i)
    .sort((a, b) => b.length - a.length);
  if (!matched.length) return text;

  const rx = new RegExp(`(${matched.map(escapeRegExp).join('|')})`, 'gi');
  const keys = new Set(matched.map(p => p.toLocaleLowerCase()));
  return text.split(rx).map((part, index) =>
    keys.has(part.toLocaleLowerCase()) ? (
      <mark key={`${part}-${index}`} className="ccba-question-key font-bold text-sky-300">
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
    // (SME) / (BA) là viết tắt trong nội dung, không phải nhãn đáp án E) / A).
    const preceding = content.slice(Math.max(0, found - 8), found);
    if (!/\([A-Za-z]{1,5}$/.test(preceding)) indexes.push(found);
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
      const nextIndex = findAllLabelIndexes(content, label)
        .find((index) => index >= searchFrom) ?? -1;
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
          id: `${set.id}-q${originalNumber}-i${fallbackIndex}-${position.label}`,
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
    id: `${set.id}-q${originalNumber}-i${fallbackIndex}`,
    sourceSetId: set.id,
    sourceTitle: set.title,
    sourceFileName: set.fileName,
    originalNumber,
    sourceOrdinal: fallbackIndex + 1,
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
    case 'traceability':
    case 'inputs':
    case 'purpose':
    case 'general':
      return 74;
    case 'completeness':
    case 'relationship-quality':
      return 75;
    case 'techniques':
    case 'output':
      return 76;
    default:
      return 74;
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


/* ===== BABOK PDF VIEWER - SCROLL + TOOLBAR, KHONG CAN CAI THU VIEN ===== */

type BabokPdfRenderTask = {
  promise: Promise<unknown>;
  cancel: () => void;
};

type BabokPdfPageHandle = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
    transform?: number[];
  }) => BabokPdfRenderTask;
};

type BabokOutlineItem = {
  title: string;
  dest?: string | unknown[] | null;
  items?: BabokOutlineItem[];
};

type BabokPdfDocumentHandle = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<BabokPdfPageHandle>;
  getOutline: () => Promise<BabokOutlineItem[] | null>;
  getDestination: (name: string) => Promise<unknown[] | null>;
  getPageIndex: (ref: unknown) => Promise<number>;
};

type BabokPdfLibraryHandle = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { url: string }) => {
    promise: Promise<BabokPdfDocumentHandle>;
  };
};

const BABOK_PDFJS_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
let babokLibraryPromise: Promise<BabokPdfLibraryHandle> | null = null;
let babokDocumentPromise: Promise<BabokPdfDocumentHandle> | null = null;

function loadBabokPdfLibrary(): Promise<BabokPdfLibraryHandle> {
  if (babokLibraryPromise) return babokLibraryPromise;

  babokLibraryPromise = new Promise<BabokPdfLibraryHandle>((resolve, reject) => {
    const existing = (window as Window & {
      pdfjsLib?: BabokPdfLibraryHandle;
    }).pdfjsLib;

    if (existing) {
      existing.GlobalWorkerOptions.workerSrc =
        `${BABOK_PDFJS_CDN}pdf.worker.min.js`;
      resolve(existing);
      return;
    }

    const script = document.createElement('script');
    script.src = `${BABOK_PDFJS_CDN}pdf.min.js`;
    script.onload = () => {
      const library = (window as Window & {
        pdfjsLib?: BabokPdfLibraryHandle;
      }).pdfjsLib;
      if (!library) {
        reject(new Error('Không khởi tạo được PDF.js'));
        return;
      }
      library.GlobalWorkerOptions.workerSrc =
        `${BABOK_PDFJS_CDN}pdf.worker.min.js`;
      resolve(library);
    };
    script.onerror = () => reject(
      new Error('Không tải được PDF.js từ CDN. Hãy kiểm tra Internet hoặc CSP.')
    );
    document.head.appendChild(script);
  }).catch((error) => {
    babokLibraryPromise = null;
    throw error;
  });

  return babokLibraryPromise;
}

function getBabokPdfDocument(): Promise<BabokPdfDocumentHandle> {
  if (!babokDocumentPromise) {
    babokDocumentPromise = loadBabokPdfLibrary()
      .then((library) => library.getDocument({ url: babokPdfPublicUrl() }).promise)
      .catch((error) => {
        babokDocumentPromise = null;
        throw error;
      });
  }
  return babokDocumentPromise;
}

const BabokPdfLazyPage = React.memo(function BabokPdfLazyPage({
  pageNumber,
  pageWidth,
  estimatedHeight,
  visible,
}: {
  pageNumber: number;
  pageWidth: number;
  estimatedHeight: number;
  visible: boolean;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let task: BabokPdfRenderTask | null = null;
    setError('');

    const draw = async () => {
      try {
        const pdf = await getBabokPdfDocument();
        if (cancelled) return;
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const original = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: pageWidth / original.width });
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.ceil(viewport.width * pixelRatio);
        canvas.height = Math.ceil(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        task = page.render({
          canvasContext: context,
          viewport,
          transform: [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        await task.promise;
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Lỗi vẽ trang PDF');
        }
      }
    };

    void draw();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pageNumber, pageWidth, visible]);

  return (
    <div
      className="relative mx-auto mb-3 bg-white shadow-sm"
      style={{ width: pageWidth, minHeight: estimatedHeight }}
    >
      {visible && (
        <canvas ref={canvasRef} className="block" />
      )}
      {error && (
        <p className="absolute left-2 top-2 bg-white p-2 text-xs text-red-600">
          Trang {pageNumber}: {error}
        </p>
      )}
    </div>
  );
});

function BabokPdfCanvas({
  pageNumber,
  fullScreen = false,
  compact = false,
}: {
  pageNumber: number;
  fullScreen?: boolean;
  compact?: boolean;
}) {
  const readerRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const searchRunRef = React.useRef(0);

  const [pdf, setPdf] = useState<BabokPdfDocumentHandle | null>(null);
  const [outline, setOutline] = useState<BabokOutlineItem[]>([]);
  const [showOutline, setShowOutline] = useState(false);
  const [currentPage, setCurrentPage] = useState(pageNumber);
  const [pageInput, setPageInput] = useState(String(pageNumber));
  const [readerWidth, setReaderWidth] = useState(380);
  const [aspectRatio, setAspectRatio] = useState(1.3);
  const [zoom, setZoom] = useState(1);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(
    () => new Set([pageNumber])
  );
  const [search, setSearch] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    getBabokPdfDocument().then(async (loadedPdf) => {
      if (!active) return;
      setPdf(loadedPdf);
      const firstPage = await loadedPdf.getPage(1);
      if (active) {
        const viewport = firstPage.getViewport({ scale: 1 });
        setAspectRatio(viewport.height / viewport.width);
      }
      const foundOutline = await loadedPdf.getOutline();
      if (active) setOutline(foundOutline || []);
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Không tải được PDF');
    });
    return () => {
      active = false;
      searchRunRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const element = readerRef.current;
    if (!element) return;
    const updateWidth = () => setReaderWidth(Math.max(240, element.clientWidth - 18));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [showOutline]);

  const pageWidth = Math.max(210, Math.round(readerWidth * zoom));
  const estimatedHeight = Math.round(pageWidth * aspectRatio);
  const pages = useMemo(
    () => Array.from({ length: pdf?.numPages || 0 }, (_, index) => index + 1),
    [pdf?.numPages]
  );

  const scrollToPage = (requested: number) => {
    const scroller = scrollRef.current;
    if (!scroller || !pdf) return;
    const next = Math.max(1, Math.min(pdf.numPages, Math.round(requested)));
    const element = scroller.querySelector<HTMLElement>(`[data-pdf-page="${next}"]`);
    if (!element) return;
    scroller.scrollTop +=
      element.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    setCurrentPage(next);
    setPageInput(String(next));
    setVisiblePages((previous) => new Set([...previous, next]));
  };

  useEffect(() => {
    if (!pdf) return;
    const frame = requestAnimationFrame(() => scrollToPage(pageNumber));
    return () => cancelAnimationFrame(frame);
  }, [pdf, pageNumber, aspectRatio]);

  useEffect(() => {
    if (!pdf || !scrollRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      setVisiblePages((previous) => {
        const next = new Set(previous);
        entries.forEach((entry) => {
          const page = Number(entry.target.getAttribute('data-pdf-page'));
          if (!page) return;
          if (entry.isIntersecting) next.add(page);
          else next.delete(page);
        });
        if (next.size === previous.size &&
          [...next].every((number) => previous.has(number))) return previous;
        return next;
      });
    }, {
      root: scrollRef.current,
      rootMargin: '600px 0px',
      threshold: 0,
    });
    scrollRef.current.querySelectorAll('[data-pdf-page]').forEach((item) =>
      observer.observe(item)
    );
    return () => observer.disconnect();
  }, [pdf, pageWidth, showOutline]);

  const handleScroll = () => {
    const scroller = scrollRef.current;
    if (!scroller || !pdf) return;
    // Lấy trang đầu tiên nằm dưới đỉnh vùng cuộn, không ước lượng chiều cao.
    const pageNodes = scroller.querySelectorAll<HTMLElement>('[data-pdf-page]');
    const top = scroller.getBoundingClientRect().top + 18;
    let low = 0;
    let high = pageNodes.length - 1;
    let found = 0;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (pageNodes[mid].getBoundingClientRect().top <= top) {
        found = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    const visiblePage = found + 1;
    if (visiblePage !== currentPage) {
      setCurrentPage(visiblePage);
      setPageInput(String(visiblePage));
    }
  };

  const goToOutlineItem = async (item: BabokOutlineItem) => {
    if (!pdf || !item.dest) return;
    try {
      const dest = typeof item.dest === 'string'
        ? await pdf.getDestination(item.dest)
        : item.dest;
      if (!Array.isArray(dest) || !dest[0]) return;
      const index = typeof dest[0] === 'number'
        ? dest[0]
        : await pdf.getPageIndex(dest[0]);
      scrollToPage(index + 1);
    } catch {
      setSearchStatus('Không xác định được trang của mục lục này.');
    }
  };

  const renderOutline = (items: BabokOutlineItem[], depth = 0): React.ReactNode =>
    items.map((item, index) => (
      <div key={`${depth}-${index}-${item.title}`}>
        <button
          type="button"
          onClick={() => void goToOutlineItem(item)}
          className="w-full rounded px-2 py-1.5 text-left text-xs text-slate-800 hover:bg-slate-200"
          style={{ paddingLeft: Math.min(depth * 12 + 8, 48) }}
        >
          {item.title}
        </button>
        {item.items?.length ? renderOutline(item.items, depth + 1) : null}
      </div>
    ));

  const findInPdf = async () => {
    if (!pdf || !search.trim()) return;
    const token = ++searchRunRef.current;
    const query = search.trim().toLocaleLowerCase();
    setSearchStatus('Đang tìm trong tài liệu...');
    for (let step = 0; step < pdf.numPages; step += 1) {
      if (searchRunRef.current !== token) return;
      const current = ((currentPage - 1 + step) % pdf.numPages) + 1;
      try {
        const page = await pdf.getPage(current);
        const content = await page.getTextContent();
        if (searchRunRef.current !== token) return;
        const plainText = content.items.map((item) => item.str || '').join(' ').toLocaleLowerCase();
        if (plainText.includes(query)) {
          scrollToPage(current);
          setSearchStatus(`Tìm thấy tại trang ${current} (chưa tô sáng từ khóa).`);
          return;
        }
      } catch {
        // Bỏ qua trang không trích xuất được chữ.
      }
    }
    if (searchRunRef.current === token) setSearchStatus('Không tìm thấy nội dung.');
  };

  return (
    <div className={cn('flex w-full min-w-0 flex-col overflow-hidden bg-white text-slate-900', compact && 'h-full min-h-0')}>
      {compact ? (
        <div className="flex shrink-0 items-center justify-between gap-1 border-b border-slate-300 bg-slate-100 px-2 py-2 text-[11px]">
          <button type="button" disabled={!pdf || currentPage<=1} onClick={() => scrollToPage(currentPage-1)} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40">‹</button>
          <span className="whitespace-nowrap"><strong>{currentPage}</strong> / {pdf?.numPages ?? '…'}</span>
          <button type="button" disabled={!pdf || currentPage>=(pdf?.numPages||0)} onClick={() => scrollToPage(currentPage+1)} className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40">›</button>
          <button type="button" onClick={() => setZoom(z=>Math.max(.5,+(z-.2).toFixed(2)))} className="rounded border border-slate-300 px-2 py-1">−</button>
          <span className="whitespace-nowrap">{Math.round(zoom*100)}%</span>
          <button type="button" onClick={() => setZoom(z=>Math.min(2,+(z+.2).toFixed(2)))} className="rounded border border-slate-300 px-2 py-1">+</button>
        </div>
      ) : (
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-300 bg-slate-100 p-2 text-xs">
        <button type="button" onClick={() => setShowOutline((value) => !value)}
          className="rounded border border-slate-300 px-2 py-1">☰ Mục lục</button>
        <button type="button" disabled={!pdf || currentPage <= 1} onClick={() => scrollToPage(currentPage - 1)}
          className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40">‹</button>
        <input type="number" min={1} max={pdf?.numPages} value={pageInput}
          aria-label="Trang PDF" onChange={(event) => setPageInput(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') scrollToPage(Number(pageInput)); }}
          onBlur={() => { const n = Number(pageInput); if (Number.isInteger(n) && n >= 1) scrollToPage(n); else setPageInput(String(currentPage)); }}
          className="w-12 rounded border border-slate-300 bg-white px-1 py-1 text-center text-xs" />
        <span>/ {pdf?.numPages ?? '...'}</span>
        <button type="button" disabled={!pdf || currentPage >= pdf.numPages} onClick={() => scrollToPage(currentPage + 1)}
          className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40">›</button>
        <button type="button" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(2)))}
          className="rounded border border-slate-300 px-2 py-1">−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((z) => Math.min(2, +(z + 0.2).toFixed(2)))}
          className="rounded border border-slate-300 px-2 py-1">+</button>
        <form onSubmit={(event) => { event.preventDefault(); void findInPdf(); }} className="flex min-w-[120px] flex-1 items-center gap-1">
          <input value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm trong sách" aria-label="Tìm nội dung trong PDF"
            className="min-w-0 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs" />
          <button type="submit" disabled={!pdf || !search.trim()} className="rounded bg-slate-700 px-2 py-1 text-white disabled:opacity-40">Tìm</button>
        </form>
        <a href={babokPdfPublicUrl()} target="_blank" rel="noreferrer"
          className="rounded border border-slate-300 px-2 py-1">PDF gốc</a>
      </div>
      )}
      {searchStatus && <p className="bg-slate-50 px-2 py-1 text-[11px] text-slate-600">{searchStatus}</p>}
      <div className={cn('flex min-h-0 w-full overflow-hidden', compact && 'flex-1')}>
        {showOutline && (
          <aside className={cn('w-36 shrink-0 overflow-auto border-r border-slate-200 bg-white sm:w-44',compact ? 'h-full max-h-full' : 'max-h-[370px] lg:max-h-[calc(100vh-450px)]')}>
            {outline.length ? renderOutline(outline) : (
              <p className="p-3 text-xs text-slate-500">File PDF chưa có bookmark/mục lục.</p>
            )}
          </aside>
        )}
        <div ref={readerRef} className="min-w-0 min-h-0 flex-1">
          <div ref={scrollRef} onScroll={handleScroll}
            className={fullScreen
              ? 'h-[calc(100vh-170px)] overflow-auto bg-slate-300'
              : compact ? 'h-full min-h-0 overflow-auto bg-slate-300'
              : 'h-[370px] overflow-auto bg-slate-300 lg:h-[calc(100vh-450px)] lg:min-h-[280px]'}
            style={{ overscrollBehavior: 'contain' }}>
            {error && <p className="p-3 text-sm text-red-700">Lỗi PDF: {error}</p>}
            {!pdf && !error && <p className="p-3 text-sm">Đang tải sách BABOK...</p>}
            <div className="w-max min-w-full p-2">
              {pages.map((page) => (
                <div data-pdf-page={page} key={page}>
                  <BabokPdfLazyPage
                    pageNumber={page}
                    pageWidth={pageWidth}
                    estimatedHeight={estimatedHeight}
                    visible={visiblePages.has(page)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== END BABOK PDF VIEWER ===== */


/**
 * Những liên hệ KEY → kiến thức đã kiểm tra với câu hỏi và đáp án gốc.
 * Không dùng suy luận chung chung để khẳng định đáp án của tất cả câu hỏi.
 * Câu chưa có quy tắc đặc thù dùng hướng dẫn kiểm chứng rõ ràng.
 */
type PracticalKeyInsight = {
  clue: string;
  principle: string;
  contrast: string;
  specific: boolean;
};

/** Viết [[KEY tiếng Anh]] để làm nổi bật KEY ngay trong câu tiếng Việt. */
function emphasizeBilingualKeys(value: string): React.ReactNode {
  const pieces = value.split(/(\[\[[^\]]+\]\]|\*\*[^*]+\*\*|\*[^*\n]+\*|\n)/g);
  return pieces.map((piece, index) => {
    if (piece.startsWith('[[') && piece.endsWith(']]')) {
      return <strong key={index} className="ccba-learning-key">{piece.slice(2, -2)}</strong>;
    }
    if (piece.startsWith('**') && piece.endsWith('**')) {
      return <strong key={index} className="ccba-learning-key">{piece.slice(2, -2)}</strong>;
    }
    if (piece.startsWith('*') && piece.endsWith('*')) {
      return <em key={index}>{piece.slice(1, -1)}</em>;
    }
    return piece === '\n' ? <br key={index} /> : <React.Fragment key={index}>{piece}</React.Fragment>;
  });
}

/** Present the content blocks stored in JSON; no CCBA theory or per-question answer hardcoded in the UI. */
function renderStudyBlocks(blocks: StudyParagraphBlock[] | undefined, fallback: string): React.ReactNode {
  const chosen = blocks?.length ? blocks : [{type: 'paragraph' as const, text: fallback}];
  return chosen.map((block, index) => {
    const text = block.text || '';
    if (block.type === 'process') {
      return <div key={index} className="ccba-lesson-process">
        <span className="ccba-lesson-process-caption">TRÌNH TỰ CẦN NHỚ</span>
        <div className="ccba-lesson-process-steps">{(block.steps || []).map((step, idx) =>
          <React.Fragment key={idx}>{idx > 0 && <span className="ccba-lesson-arrow">→</span>}<span className="ccba-lesson-process-step">{step}</span></React.Fragment>
        )}</div>
      </div>;
    }
    const className = block.type === 'insight' ? 'ccba-lesson-insight' :
      block.type === 'tip' ? 'ccba-lesson-tip' :
      block.type === 'answer' ? 'ccba-lesson-answer' : 'ccba-lesson-paragraph';
    return <div key={index} className={className}>{emphasizeBilingualKeys(text)}</div>;
  });
}

/** Only show per-option reasoning when authored in JSON and matched to the ACTUAL options in this question. */
function renderOptionReasons(question: Question, explanations: AnswerOptionExplanation[] | undefined): React.ReactNode | null {
  if (!explanations?.length || explanations.length !== question.options.length) return null;
  const normalized = (value: string) => value.replace(/\s+/g,' ').trim().toLocaleLowerCase();
  if (!question.options.every((opt,i) => normalized(opt.text) === normalized(explanations[i].text))) return null;
  return <div className="ccba-option-reason-list">{question.options.map((option, index) => (
    <div key={option.id} className={'ccba-option-reason' + (option.isCorrect ? ' ccba-option-reason-correct' : '')}>
      <div className="ccba-option-head"><span className="ccba-option-letter">{String.fromCharCode(65+index)}</span>
        <strong className="ccba-option-title">{option.text}</strong>{option.isCorrect && <span className="ccba-option-correct-tag">✓ Đúng</span>}
      </div>
      <div className="ccba-option-detail">{emphasizeBilingualKeys(explanations[index].why)}</div>
    </div>
  ))}</div>;
}

/** A paragraph-only fallback for older JSON, so all 1017 questions gain legible spacing without invented rationales. */
function renderContrastParagraphs(text: string, question: Question, kb?: ExcelKnowledge | null, blocks?: StudyParagraphBlock[]): React.ReactNode {
  const paragraphs = blocks?.length ? blocks.map(block=>block.text || '').filter(Boolean)
    : text.split(/\n+|(?<=[.;!?])\s+(?=(?:\[\[)?[A-ZÀ-ỸĐ])/).filter(part=>part.trim());
  return paragraphs.map((part,index) =>
    <p key={index} className="ccba-lesson-paragraph">{emphasizeContrastKeys(part.trim(), question, kb)}</p>
  );
}

/**
 * Chỉ xử lý CÁCH HIỂN THỊ cho mục "Dễ nhầm — Cách loại trừ".
 * Nội dung kiến thức luôn do ccba-excel-knowledge.json quyết định:
 *   [[thuật ngữ]] / **thuật ngữ** = nhấn xanh có chủ đích;
 *   từ chưa đánh dấu = chỉ nhấn xanh nếu thực sự là tên lựa chọn/thuật ngữ
 *   có mặt nguyên văn trong đoạn giải thích (không tự sinh thêm lời giải).
 */
function emphasizeContrastKeys(
  value: string,
  question: Question,
  kb?: ExcelKnowledge | null
): React.ReactNode {
  // Các nhãn bố cục không phải KEY kiến thức; in đậm nhẹ nhưng KHÔNG xanh.
  const nonKeyLabels = new Set([
    'ý mà đề yêu cầu', 'ý đề yêu cầu', 'lựa chọn gây nhiễu',
    'đáp án còn lại', 'câu hỏi', 'cách loại trừ', 'kiến thức cần nhớ',
  ]);
  const lower = value.toLocaleLowerCase();
  const candidateTerms: string[] = [];
  const seenTerms = new Set<string>();
  const addTerm = (raw: string) => {
    const term = raw.trim().replace(/\s+/g, ' ');
    const lowered = term.toLocaleLowerCase();
    if (
      term.length < 5 || term.length > 90 ||
      nonKeyLabels.has(lowered) ||
      /^(?:business|project|requirements?|stakeholders?|solutions?|designs?|approach|task|note)$/i.test(term) ||
      !lower.includes(lowered) || seenTerms.has(lowered)
    ) return;
    seenTerms.add(lowered);
    candidateTerms.push(term);
  };

  // Các đáp án gây nhiễu là nội dung cần nhận diện rõ nhất ở mục loại trừ.
  for (const option of question.options) {
    if (option.isCorrect) continue;
    const clean = option.text.trim().replace(/\s+/g, ' ');
    if (clean.length <= 90) {
      addTerm(clean);
    } else {
      // JSON thường chỉ trích một phần đầu của phương án dài.
      // Chỉ lấy cụm đầu nguyên văn, không tự viết lại lựa chọn.
      const preview = clean.slice(0, 65).replace(/\s+\S*$/, '').trim();
      if (preview.length >= 22) addTerm(preview);
    }
  }
  for (const term of KEYWORD_GLOSSARY) addTerm(term.en);
  for (const term of kb?.dictionary || []) addTerm(term.en);
  for (const term of kb?.techniques || []) addTerm(term.name);
  for (const task of kb?.tasks || []) {
    addTerm(task.name.replace(/^\d+(?:\.\d+)+\s*/, ''));
  }

  const parts = value.split(/(\[\[[^\]]+\]\]|\*\*[^*]+\*\*)/g);
  let autoCount = 0;
  const maxAuto = 5; // Tối đa 5 cụm tự nhận diện; KEY đánh dấu chủ đích không giới hạn.
  const decorated: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    const bracket = part.startsWith('[[') && part.endsWith(']]');
    const markdown = part.startsWith('**') && part.endsWith('**');
    if (bracket || markdown) {
      const label = bracket ? part.slice(2, -2) : part.slice(2, -2);
      decorated.push(
        nonKeyLabels.has(label.trim().toLocaleLowerCase())
          ? <strong key={`label-${i}`} className="font-semibold">{label}</strong>
          : <strong key={`key-${i}`} className="ccba-learning-key">{label}</strong>
      );
      continue;
    }
    if (autoCount >= maxAuto || !candidateTerms.length) {
      decorated.push(<React.Fragment key={`plain-${i}`}>{part}</React.Fragment>);
      continue;
    }

    // Chọn các cụm dài trước để tránh tô lồng (VD "Domain SME" với "SME").
    const matches: Array<{ start: number; end: number }> = [];
    const partLower = part.toLocaleLowerCase();
    for (const candidate of candidateTerms.sort((a, b) => b.length - a.length)) {
      let from = 0;
      const needle = candidate.toLocaleLowerCase();
      while (from < part.length && matches.length < 24) {
        const start = partLower.indexOf(needle, from);
        if (start < 0) break;
        const end = start + candidate.length;
        from = end;
        // Không tô một phần của từ dài hơn.
        const before = start ? part[start - 1] : '';
        const after = end < part.length ? part[end] : '';
        if (/[a-zA-Z0-9]/.test(before) || /[a-zA-Z0-9]/.test(after)) continue;
        if (matches.some(m => start < m.end && end > m.start)) continue;
        matches.push({ start, end });
        if (matches.length >= maxAuto - autoCount) break;
      }
      if (matches.length >= maxAuto - autoCount) break;
    }
    matches.sort((a, b) => a.start - b.start);
    let offset = 0;
    for (let j = 0; j < matches.length; j++) {
      const match = matches[j];
      if (match.start > offset) decorated.push(<React.Fragment key={`txt-${i}-${j}`}>{part.slice(offset, match.start)}</React.Fragment>);
      decorated.push(<strong key={`term-${i}-${j}`} className="ccba-learning-key">{part.slice(match.start, match.end)}</strong>);
      offset = match.end;
      autoCount++;
    }
    if (offset < part.length) decorated.push(<React.Fragment key={`tail-${i}`}>{part.slice(offset)}</React.Fragment>);
  }
  return decorated;
}

/** Đọc QUY TẮC từ JSON, không viết kiến thức học cứng trong App.tsx. */
function buildPracticalKeyInsight(
  question: Question,
  guide: BabokStudyGuide,
  kb?: ExcelKnowledge | null
): PracticalKeyInsight {
  const q = question.text;
  const answer = question.options.find((item) => item.isCorrect)?.text || '';
  for (const rule of kb?.examRules || []) {
    try {
      const answerRx = new RegExp(rule.answerPattern, rule.answerFlags || 'i');
      const questionRx = new RegExp(rule.questionPattern, rule.questionFlags || 'i');
      if (answerRx.test(answer) && questionRx.test(q)) {
        return {clue:rule.clue, principle:rule.principle, contrast:rule.contrast, specific:true};
      }
    } catch {
      // Một quy tắc nhập sai định dạng không được phép làm hỏng màn hình câu hỏi.
      continue;
    }
  }
  return {
    clue:'Câu này chưa có quy tắc KEY đủ cụ thể. Hãy xác định chính xác ý mà câu hỏi đang kiểm tra.',
    principle:`Tham khảo BABOK ${guide.focus.sectionLabel} — ${guide.primary.titleEn}. Chưa có lời giải riêng đã được kiểm tra đầy đủ.`,
    contrast:'Chưa có thông tin đủ chắc chắn để loại trừ cụ thể từng đáp án trong dữ liệu học.',
    specific:false
  };
}

/** Câu có lời giải biên tập được xác định bằng file + câu gốc + kiểm tra nguyên văn và đáp án. */
function findCuratedQuestionInsight(question: Question, kb?: ExcelKnowledge | null): CuratedQuestionInsight | undefined {
  if (!kb?.questionExplanations) return undefined;
  const setKey = detectQuestionSetKey(question);
  if (!setKey) return undefined;
  const notes = kb.questionExplanations[setKey];
  const match = notes?.[`@${question.sourceOrdinal}`] || notes?.[String(question.originalNumber)];
  if (!match || !match.anchor || !match.correctAnswer) return undefined;
  if (!question.text.toLowerCase().includes(match.anchor.toLowerCase())) return undefined;
  const correct = question.options.find(item => item.isCorrect)?.text || '';
  const normalize = (s:string) => s.toLowerCase().replace(/\s+/g,' ').trim();
  if (normalize(correct) !== normalize(match.correctAnswer)) return undefined;
  return match;
}

/** Cho câu trả lời đã chọn: tìm đúng mục kỹ thuật / ghi chú trong Excel, không match bừa bằng mã 10.x. */
function matchExcelTechnique(question: Question, kb?: ExcelKnowledge | null): ExcelTechnique | undefined {
  if (!kb) return undefined;
  const answer = question.options.find((item) => item.isCorrect)?.text.toLowerCase() || '';
  const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const actual = ` ${normalize(answer)} `;
  const candidates = kb.techniques.filter((technique) => {
    const name = normalize(technique.name);
    // Only match technique names that are meaningful multi-word strings or an exact short answer.
    return (name.length > 7 && actual.includes(` ${name} `)) || actual.trim() === name;
  });
  return candidates.sort((a,b) => b.name.length - a.name.length)[0];
}

function matchExcelTask(section: string, kb?: ExcelKnowledge | null): ExcelTask | undefined {
  if (!kb) return undefined;
  const code = (section.match(/[3-8]\.\d+/) || [])[0];
  return kb.tasks.find(task => task.section === code);
}

function matchExcelMemory(question: Question, section: string, kb?: ExcelKnowledge | null): ExcelMemory | undefined {
  if (!kb) return undefined;
  const q = `${question.text} ${question.options.find((item) => item.isCorrect)?.text || ''}`.toLowerCase();
  const words = new Set((q.match(/[a-z]{4,}/g) || []).filter(w => !['what','which','when','would','should','with','that','from','have','this','their','they','does','being','business','analysis','requirements','stakeholders','information'].includes(w)));
  const candidates = kb.memorize.filter((memo) => memo.section && (
    section === memo.section || section.startsWith(`${memo.section}.`) || memo.section.startsWith(`${section}.`)
  ));
  const rated = candidates.map((memo) => {
    const text = memo.note.toLowerCase();
    let score = memo.section === section ? 3 : 1;
    for(const word of words){ if (text.includes(word)) score += 1; }
    return {memo, score};
  }).sort((a,b) => b.score-a.score);
  return rated.length && rated[0].score >= 4 ? rated[0].memo : undefined;
}


/** Chỉ tính câu phủ định khi "NOT/EXCEPT/LEAST" là yêu cầu chọn ngoại lệ.
 * "not finalized" ở trong tình huống KHÔNG phải câu hỏi loại trừ. */
function isNegativeExamQuestion(q: string): boolean {
  const firstQuestion = q.slice(0, 220);
  return /\bexcept\b|\bleast\s+(?:likely|appropriate|suitable)|\bwhich\b.{0,75}\b(?:is|are|does|do|would|could|will)\s+not\b|\bwhat\b.{0,75}\b(?:is|are|does|do|would|could|will)\s+not\b|\bstatement\b.{0,100}\bfalse\b|\bincorrect\s+(?:statement|option)/i.test(firstQuestion);
}

/** Chỉ đưa lên màn hình KEY thực sự có trong câu (không hiện cụm từ không xuất hiện). */
const QUESTION_KEY_PHRASES: Array<[RegExp, string]> = [
  [/\bnot finalized\b/i,'chưa được chốt'],
  [/\bonly makes sense\b/i,'chỉ có ý nghĩa khi điều kiện được thỏa'],
  [/\brelated requirement\b/i,'yêu cầu liên quan'],
  [/\brequirements prioritization\b/i,'xếp ưu tiên yêu cầu'],
  [/\btypical factors\b/i,'các tiêu chí thường dùng'],
  [/\bthree common types of elicitation\b/i,'ba nhóm hình thức khai thác thông tin'],
  [/\bcomplete set of tasks\b/i,'đầy đủ các nhiệm vụ'],
  [/\btest case\b/i,'ca kiểm thử'],
  [/\bregulatory (?:or policy )?compliance\b/i,'tuân thủ quy định/chính sách'],

  [/\brequires? further analysis\b/i,'còn cần phân tích thêm'],
  [/\bself.contained\b/i,'tự đầy đủ / độc lập'],
  [/\bunderstood independently\b/i,'có thể hiểu độc lập'],
  [/\bquality standards?\b/i,'tiêu chuẩn chất lượng'],
  [/\bdefined correctly\b/i,'định nghĩa/đặc tả đúng'],
  [/\bbusiness (?:needs?|value)\b/i,'nhu cầu / giá trị kinh doanh'],
  [/\bfuture state\b/i,'trạng thái tương lai'],
  [/\bcurrent state\b/i,'trạng thái hiện tại'],
  [/\bshort iterations?\b/i,'vòng lặp ngắn'],
  [/\brapid delivery\b/i,'cung cấp giá trị nhanh'],
  [/\bup.front uncertainty\b/i,'bất định ngay từ đầu'],
  [/\bformal documentation\b/i,'tài liệu chính thức'],
  [/\bspecific phases?\b/i,'giai đoạn cụ thể'],
  [/\bapproval authority\b/i,'thẩm quyền phê duyệt'],
  [/\bwho (?:has|holds) (?:the )?authority\b/i,'ai có thẩm quyền'],
  [/\bdecision.making authority\b/i,'thẩm quyền quyết định'],
  [/\bchange control\b/i,'kiểm soát thay đổi'],
  [/\bstakeholder engagement\b/i,'sự gắn kết bên liên quan'],
  [/\bsource information\b/i,'thông tin từ nguồn'],
  [/\baccurac(?:y|ies)\b/i,'độ chính xác'],
  [/\bconsisten(?:t|cy)\b/i,'nhất quán'],
  [/\b elicitation results?\b/i,'kết quả khai thác thông tin'],
  [/\binput(?:s)? (?:to|for|of)\b/i,'đầu vào cho task'],
  [/\boutput(?:s)? (?:of|for|from)\b/i,'đầu ra của task'],
  [/\btechniques? (?:for|used|would)\b/i,'kỹ thuật cần dùng'],
  [/\bmost (?:appropriate|suitable|likely)\b/i,'phù hợp nhất / khả năng cao nhất'],
  [/\bwhich (?:task|knowledge area)\b/i,'xác định task / knowledge area'],
  [/\bwhat (?:task|term)\b/i,'xác định task / thuật ngữ'],
  [/\bprimary purpose\b/i,'mục đích chính'],
  [/\bbest suited\b/i,'phù hợp nhất'],
  [/\brisk tolerance\b/i,'mức chịu rủi ro'],
  [/\bunder.performing\b/i,'hoạt động kém'],
  [/\broot causes?\b/i,'nguyên nhân gốc'],
  [/\bexisting solution\b/i,'giải pháp hiện có'],
  [/\bimplemented solution\b/i,'giải pháp đã triển khai'],
  [/\bpotential value\b/i,'giá trị tiềm năng'],
  [/\bactual value\b/i,'giá trị thực tế'],
  [/\bboundar(?:y|ies)\b/i,'ranh giới'],
  [/\bdependencies\b/i,'phụ thuộc'],
  [/\bbackward traceability\b/i,'truy vết ngược'],
  [/\bforward traceability\b/i,'truy vết xuôi'],
  [/\bimpact analysis\b/i,'phân tích tác động'],
  [/\blong.term\b/i,'dài hạn'],
  [/\bongoing\b/i,'liên tục'],
  [/\bqualitative\b/i,'định tính'],
  [/\bquantitative\b/i,'định lượng'],
  [/\bhistorical data\b/i,'dữ liệu lịch sử'],
  [/\bidentify trends?\b/i,'tìm xu hướng'],
  [/\binteract\b/i,'tương tác'],
  [/\binformation passed\b/i,'thông tin được trao đổi'],
  [/\blife cycle\b/i,'vòng đời'],
  [/\btrigger\b/i,'điều kiện/sự kiện kích hoạt'],
  [/\bcomplex (?:business )?function\b/i,'chức năng phức tạp'],
  [/\bconstituent parts?\b/i,'các bộ phận cấu thành'],
  [/\bdata element\b/i,'phần tử dữ liệu'],
  [/\btraining\b/i,'đào tạo'],
  [/\bdata conversion\b/i,'chuyển đổi dữ liệu'],
  [/\btime.bound(?:ed)?\b/i,'có thời hạn'],
  [/\bmeasurable\b/i,'đo lường được'],
];

function detectQuestionKeyEvidence(questionText: string, limit = 3): string[] {
  const found: Array<{index:number; end:number; key:string; vi:string}> = [];
  for (const [rx, vi] of QUESTION_KEY_PHRASES) {
    const match = rx.exec(questionText);
    if (match) found.push({ index: match.index, end: match.index + match[0].length, key:match[0].trim(), vi });
  }
  const selected: typeof found = [];
  for(const item of found.sort((a,b) => (b.end-b.index)-(a.end-a.index))) {
    if (selected.some(x => item.index < x.end && item.end > x.index)) continue;
    selected.push(item);
  }
  return selected.sort((a,b)=>a.index-b.index).slice(0,limit).map(x => `[[${x.key}]] (${x.vi})`);
}

function contextualQuestionExcerpt(questionText: string): string {
  const compact=questionText.replace(/\s+/g,' ').trim();
  const after = compact.match(/\b(?:when|where|if|because|in order to|so that|with a view to)\b.{16,95}/i);
  if(after){
    const piece=after[0].replace(/[?.,;].*$/,'').trim();
    return `Đề mô tả [[${piece}]] → cần hiểu ý tình huống trước khi chọn.`;
  }
  const last = compact.slice(-102).replace(/^[^ ]+ /,'').replace(/\?$/,'').trim();
  return `Đề hỏi [[${last}]]; chú ý chính xác điều kiện được hỏi.`;
}

function matchExcelTaskByName(answer: string, kb?: ExcelKnowledge | null): ExcelTask | undefined {
  if (!kb || !answer || answer.length > 95) return undefined;
  const normalize=(x:string)=>x.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const normalized=normalize(answer);
  return kb.tasks.find(task => {
    const name=normalize(task.name.replace(/^\d+\.\d+\s+/,''));
    return name.length>10 && (normalized===name || normalized.startsWith(name+' '));
  });
}

function taskFieldRelevantToQuestion(questionText: string): 'inputs' | 'outputs' | 'elements' | 'purpose' {
  if (/\binput[s]?\b|\bprerequisite[s]?\b|\bneeded to (?:begin|perform)\b/i.test(questionText)) return 'inputs';
  if (/\boutput[s]?\b|\bdeliverable\b|\bresult (?:of|from) (?:the|this) task\b/i.test(questionText)) return 'outputs';
  if (/\belements?\b|\bcomponent[s]?\b|\bfactor[s]?\b/i.test(questionText)) return 'elements';
  return 'purpose';
}

function extractExcelLineMatchingAnswer(text: string, answer: string): string | undefined {
  if (!text || answer.length > 125) return undefined;
  const terms = answer.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/)
    .filter(x=>x.length>3 && !['which','would','about','their','there','that','with','this','from','following','business','analysis','requirements','information','stakeholder'].includes(x));
  if(!terms.length) return undefined;
  const lines = text.split(/\n|(?=\b\d+\.\s)/).map(x=>x.trim()).filter(x=>x.length>9 && x.length<400);
  const scored = lines.map(line=>({line, count:terms.filter(t=>new RegExp(`\\b${t}\\b`,'i').test(line)).length}))
    .sort((a,b)=>b.count-a.count);
  const best=scored[0];
  if(!best || best.count<Math.min(2,terms.length)) return undefined;
  return best.line.replace(/^[-+•\s]+/,'').slice(0,220);
}

/** Chỉ gắn dòng Excel khi khớp nội dung câu hỏi/đáp án, tránh gắn ghi chú lạc đề. */
function buildFocusedExcelInsight(
  question:Question, guide:BabokStudyGuide, kb:ExcelKnowledge | null | undefined,
  basic:PracticalKeyInsight
): {insight:PracticalKeyInsight; source?:string; verified:boolean; reviewStatus?:string; coverageLevel?:string; evidence?: CuratedQuestionInsight['evidence']} {
  const curated=findCuratedQuestionInsight(question,kb);
  if (curated) {
    return {
      insight: {clue:curated.clue, principle:curated.principle, contrast:curated.contrast, specific: Boolean(curated.reviewedByHuman || (curated.evidence?.directSupport && curated.coverageLevel !== 'gap'))},
      source:curated.source,
      // Có dữ liệu cho đủ 1.017 câu không đồng nghĩa đã thẩm định chuyên môn 1.017 lời giải.
      verified:curated.reviewedByHuman === true,
      reviewStatus:curated.reviewStatus,
      coverageLevel:curated.coverageLevel,
      evidence:curated.evidence
    };
  }
  const answer=question.options.find(x=>x.isCorrect)?.text || '';
  const answerCue=answer.length>80 ? 'nhóm kiến thức trong đáp án đúng' : answer;
  const evidence=detectQuestionKeyEvidence(question.text);
  const task=matchExcelTaskByName(answer,kb) || matchExcelTask(guide.focus.sectionLabel,kb);
  const technique=matchExcelTechnique(question,kb);
  const field=taskFieldRelevantToQuestion(question.text);
  const candidates: Array<{line:string;source:string;kind:string}> = [];
  const memo=matchExcelMemory(question,guide.focus.sectionLabel,kb);
  if(memo){
    const line=extractExcelLineMatchingAnswer(memo.note,answer);
    if(line) candidates.push({line,source:memo.source,kind:'Học thuộc'});
  }
  if (task){
    const line=extractExcelLineMatchingAnswer(task[field] || '',answer);
    if(line) candidates.push({line,source:task.source,kind:field});
  }
  if(technique){
    const line=extractExcelLineMatchingAnswer(technique.purpose,answer);
    if(line) candidates.push({line,source:technique.source,kind:'Purpose'});
  }
  const concrete = candidates[0];
  const contrastOption = (question.options || []).filter(x=>!x.isCorrect && x.text.length<=75).map(option=>{
    const anotherTask=matchExcelTaskByName(option.text,kb);
    const anotherTech=kb?.techniques.find(t=>t.name.toLowerCase().replace(/[^a-z]/g,' ')===option.text.toLowerCase().replace(/[^a-z]/g,' '));
    const rule=anotherTask?.keyLearning?.principle || anotherTech?.keyLearning?.principle;
    return rule ? {label:option.text,rule} : null;
  }).find(Boolean);
  const normalizeCompare = (x:string) => x.toLowerCase().replace(/[^a-z]/g,'').replace('brainstoming','brainstorming').replace('workshop','workshop').replace('surveyandquestions','surveyorquestionnaire');
  const answerComparison = kb?.comparison?.find(item => normalizeCompare(item.name) === normalizeCompare(answer));
  const wrongComparison = kb?.comparison?.find(item => question.options.some(option =>
    !option.isCorrect && normalizeCompare(option.text) === normalizeCompare(item.name)
  ));
  const compareText = answerComparison && wrongComparison && !isNegativeExamQuestion(question.text)
    ? `Theo Excel [[Compare_Simi_Tẹc]]: [[${answerComparison.name}]] dùng khi ${showExcelNote(answerComparison.when,115)}; còn [[${wrongComparison.name}]] dùng khi ${showExcelNote(wrongComparison.when,115)}. Hỏi mục đích cụ thể để phân biệt.`
    : undefined;
  const selectedContrast = compareText || (contrastOption && !isNegativeExamQuestion(question.text)
    ? `Đề cũng có [[${contrastOption.label}]]: ${contrastOption.rule} So sánh đúng mục đích/đầu ra với [[${answer}]].`
    : basic.specific ? basic.contrast
    : technique?.keyLearning?.contrast || task?.keyLearning?.contrast || 'Chưa có đối chiếu đủ cụ thể giữa các phương án trong Excel; không suy đoán chỉ vì giống từ khóa.');
  let principle=basic.principle;
  let source: string | undefined;
  if(concrete){
    // Kết luận bằng tiếng Việt từ quy tắc đã biên tập; trích đúng mẩu Excel gắn với đáp án.
    const groundedLine=showExcelNote(concrete.line,answer.length>75 ? 98 : 140);
    const vietRule=basic.specific ? basic.principle : task?.keyLearning?.principle || technique?.keyLearning?.principle || '';
    principle=answer.length>75 && basic.specific
      ? vietRule
      : `${vietRule ? `${vietRule} ` : ''}Ghi nhớ theo Excel: [[${answerCue}]] — ${groundedLine}`;
    source=concrete.source;
  } else if (technique?.keyLearning && !basic.specific) {
    principle=technique.keyLearning.principle;
    source=technique.source;
  } else if(task?.keyLearning && !basic.specific) {
    principle=task.keyLearning.principle;
    source=task.source;
  }
  // Không tự biến một ghi chú tổng quát thành lời giải được kiểm chứng cho mọi câu.
  if(!source && !basic.specific) {
    return {
      insight:{
        clue:evidence.length ? `Trong đề: ${evidence.join(' + ')}. Đối chiếu ý hỏi với [[${answerCue}]].` : `${contextualQuestionExcerpt(question.text)} Đáp án nguồn: [[${answerCue}]].`,
        principle:task?.keyLearning?.principle || `Excel/PDF chưa có ghi chú đủ cụ thể đã đối chiếu cho câu này; cần xem đúng BABOK ${guide.focus.sectionLabel}, không suy ra từ tên đáp án.`,
        contrast:'Chưa đủ bằng chứng trong ghi chú Excel để phân biệt chắc chắn các phương án gây nhiễu của riêng câu này; không dùng mẹo đoán.',
        specific:false
      }, verified:false
    };
  }
  return {
    insight:{
      // Quy tắc riêng đã biên tập cho câu hỏi có ưu tiên cao hơn các từ khóa chung.
      clue:basic.specific ? basic.clue : evidence.length ? `Trong đề có ${evidence.join(' + ')} → đối chiếu với [[${answerCue}]].` : `${contextualQuestionExcerpt(question.text)} Đáp án nguồn: [[${answer}]].`,
      principle,
      contrast:selectedContrast,
      specific: Boolean(concrete || basic.specific || technique?.keyLearning)
    }, source, verified:Boolean(concrete || basic.specific)
  };
}


/** Một nguồn bằng chứng duy nhất cho chữ xanh ở câu hỏi và Cách nhận diện.
 * Chỉ lấy cụm có thật trong nguyên văn câu hỏi, KHÔNG tô tự động theo từ điển.
 */
type QuestionKeyAlignment = {
  phrases: string[];
  recognition: string;
  // “suggested” chỉ là gợi ý trích từ nguyên văn đề, KHÔNG phải xác minh chuyên môn.
  source: 'curated' | 'pattern' | 'suggested';
};

function locateExactQuestionPhrase(questionText: string, cue: string): string | null {
  const trimmed = cue.trim();
  if (!trimmed || trimmed.length < 3 || /[\/→·]/.test(trimmed)) return null;
  const rx = new RegExp(escapeRegExp(trimmed).replace(/\\s\+/g, '\\s+'), 'i');
  const match = rx.exec(questionText);
  if (!match) return null;
  const before = questionText[match.index - 1] || '';
  const after = questionText[match.index + match[0].length] || '';
  if (/\w/.test(before) || /\w/.test(after)) return null;
  return match[0];
}

/** Luôn tạo điểm nhấn từ chính câu hỏi, kể cả khi ghi chú Excel chưa có KEY khớp.
 * Gợi ý chỉ phục vụ đọc đề, không được ngụy nhận là KEY đã được xác minh.
 */
const KEY_FALLBACK_STOP_WORDS = new Set([
  'what','which','where','when','why','how','who','whose','following','these','those',
  'their','this','that','they','there','here','then','than','would','could','should',
  'being','been','does','doing','done','have','has','had','from','with','without',
  'after','before','during','between','through','about','some','many','very','most',
  'into','only','also','will','shall','under','over','each','all','any','such','the',
  'and','for','are','was','were','can','its','not','but','both','new','old','being',
  'business','analyst','project','projects','question','following','performing',
  'main','purpose','answer','answers','best','appropriate','given','week','past',
]);
const KEY_FALLBACK_SIGNALS = /(?:\b(?:catalogu(?:e|ing)|document(?:ing|ation)?|modif(?:y|ied|ication)|remov(?:e|ed|al)|replac(?:e|ed)|creat(?:e|ing|ion)|chang(?:e|ing|es)|transition|transfer|current|future|feasib\w*|validat\w*|verif\w*|approv\w*|elicitat\w*|priorit\w*|stakeholder\w*|requirement\w*|design\w*|scope|component\w*|capabilit\w*|perform\w*|output\w*|input\w*|risk\w*|constraint\w*|assum\w*|trace\w*|traceab\w*|dependenc\w*|qualit\w*|process\w*|efficien\w*|effectiv\w*|inform\w*|data|state|solution\w*|strateg\w*|valu\w*|impact\w*|measure\w*|metric\w*|role\w*|authorit\w*|objectiv\w*|outcome\w*|actor\w*|interfac\w*|system\w*|workshop\w*|interview\w*|survey\w*|observ\w*|uncertain\w*|control\w*|cost\w*|budge\w*|schedule\w*|time\w*|deadline\w*|evaluat\w*|test\w*|support\w*|accept\w*|complet\w*|implement\w*|responsib\w*|deliver\w*|consolidat\w*|analys\w*|compar\w*|identify\w*|identif\w*|understand\w*|review\w*|communicat\w*|collaborat\w*|manag\w*|plan\w*|alternativ\w*|benefit\w*|decision\w*|baseline\w*|existing|proposed|stakeholder\w*)\b)/i;

function suggestExactQuestionPhrases(questionText: string, limit = 2): string[] {
  const tokens = Array.from(questionText.matchAll(/[A-Za-z][A-Za-z0-9'’-]*/g))
    .map(m => ({ word:m[0], from:m.index || 0, to:(m.index || 0)+m[0].length }));
  if (!tokens.length) return [];
  const total = tokens.length;
  const candidates: Array<{phrase:string; start:number; end:number; score:number}> = [];
  for(let i=0; i<total; i++) {
    for(let size=2; size<=8 && i+size<=total; size++) {
      const group=tokens.slice(i,i+size);
      const first=group[0].word.toLowerCase();
      const last=group[group.length-1].word.toLowerCase();
      if(KEY_FALLBACK_STOP_WORDS.has(first) || KEY_FALLBACK_STOP_WORDS.has(last)) continue;
      const words=group.map(t=>t.word.toLowerCase());
      const informative=words.filter(w=>w.length>3 && !KEY_FALLBACK_STOP_WORDS.has(w));
      const significant=informative.filter(w=>KEY_FALLBACK_SIGNALS.test(w));
      if(!informative.length) continue;
      const span=questionText.slice(group[0].from,group[group.length-1].to);
      // Tuyệt đối không tô một KEY kéo xuyên qua hai câu hoặc chứa chữ viết tắt BA.
      if (/[.!?;\n]/.test(span) || /\(\s*(?:BA|PM|IT)\s*\)/i.test(span)) continue;
      // Không lấy lời dẫn chung kiểu “A business analyst ...” hoặc câu hỏi “Which ...”.
      if(/^(?:a|an|the) business analyst\b/i.test(span)) continue;
      if(/\b(?:what|which|how)\b.{0,30}\b(?:following|purpose|answer)\b/i.test(span)) continue;
      const score=(significant.length*3.0 + informative.length*1.05)
        / Math.pow(size,0.53) + (significant.length>=2 ? 0.9 : 0)
        + (size>=3 && size<=7 ? 0.32 : 0)
        - (words.filter(w=>KEY_FALLBACK_STOP_WORDS.has(w)).length)*0.11
        - (informative.length-new Set(informative).size)*1.4;
      if(score<1.2) continue;
      candidates.push({phrase:span, start:group[0].from, end:group[group.length-1].to, score});
    }
  }
  const chosen: typeof candidates = [];
  for(const item of candidates.sort((a,b)=>b.score-a.score || a.start-b.start)) {
    if(chosen.some(x=>item.start<x.end && item.end>x.start)) continue;
    chosen.push(item);
    if(chosen.length>=limit) break;
  }
  if(chosen.length) return chosen.sort((a,b)=>a.start-b.start).map(x=>x.phrase);
  // Tình huống rất ngắn: vẫn lấy thuật ngữ có nghĩa, thay vì để toàn bộ đề đen.
  const content=tokens.filter(t=>t.word.length>=4 && !KEY_FALLBACK_STOP_WORDS.has(t.word.toLowerCase()));
  return (content.length ? content : tokens).slice(0,Math.max(1,limit)).map(t=>t.word);
}

function alignRecognitionToQuestion(
  questionText: string,
  insight: PracticalKeyInsight
): QuestionKeyAlignment {
  const cues: Array<{ phrase: string; vi: string }> = [];
  let keySource: QuestionKeyAlignment['source'] = 'curated';
  const markedRx = /\[\[([^\]]+)\]\](?:\s*\(([^)]+)\))?/g;
  for (const match of insight.clue.matchAll(markedRx)) {
    const phrase = locateExactQuestionPhrase(questionText, match[1]);
    if (phrase && !cues.some(c => c.phrase.toLowerCase() === phrase.toLowerCase())) {
      cues.push({ phrase, vi: match[2] || '' });
    }
  }

  // Khi quy tắc riêng không trích dẫn nguyên văn, dùng tín hiệu có mặt thật
  // trong đề; không tự suy ra KEY từ đáp án đúng.
  if (!cues.length) {
    keySource = 'pattern';
    for (const [rx, vi] of QUESTION_KEY_PHRASES) {
      const match = rx.exec(questionText);
      if (!match) continue;
      const phrase = match[0].trim();
      if (phrase.length < 5 || cues.some(c => c.phrase.toLowerCase() === phrase.toLowerCase())) continue;
      cues.push({ phrase, vi });
      if (cues.length === 3) break;
    }
  }

  // Nếu Excel/regex chưa nhận diện, CHỦ ĐỘNG gợi ý cụm nguyên văn có ý nghĩa.
  // Không ép người học đọc câu hỏi trơn màu chỉ vì hệ thống chưa có bằng chứng đầy đủ.
  if (!cues.length) {
    keySource = 'suggested';
    for(const phrase of suggestExactQuestionPhrases(questionText, 2)) {
      if(phrase.trim()) cues.push({phrase, vi:''});
    }
  }

  // Tránh phủ màu các cụm con trùng lên cụm dài. Cả hai vị trí dùng cùng danh sách.
  const sorted = cues.sort((a, b) => b.phrase.length - a.phrase.length);
  const chosen: typeof sorted = [];
  for (const item of sorted) {
    const start = questionText.toLowerCase().indexOf(item.phrase.toLowerCase());
    if (start < 0) continue;
    const end = start + item.phrase.length;
    const overlaps = chosen.some(selected => {
      const selectedStart = questionText.toLowerCase().indexOf(selected.phrase.toLowerCase());
      return start < selectedStart + selected.phrase.length && end > selectedStart;
    });
    if (!overlaps) chosen.push(item);
    if (chosen.length >= 3) break;
  }
  const phrases = chosen.map(item => item.phrase);

  // Các cụm [[...]] trong hướng dẫn nhưng KHÔNG có nguyên văn ở đề
  // sẽ chỉ là chữ bình thường, không được đánh đồng với KEY đã highlight.
  const sourceCase = new Map(phrases.map(p => [p.toLowerCase(), p]));
  const safeExplanation = insight.clue.replace(/\[\[([^\]]+)\]\]/g, (_, candidate: string) => {
    const fromQuestion = sourceCase.get(candidate.toLowerCase());
    return fromQuestion ? `[[${fromQuestion}]]` : candidate;
  });
  if (!phrases.length) {
    // Chỉ xảy ra nếu đề hoàn toàn không có chữ cái Latin hợp lệ.
    return { phrases: [], recognition: safeExplanation, source: 'suggested' };
  }

  // Bảo đảm TẤT CẢ chữ xanh trong đề đều có mặt ở Cách nhận diện (cùng ký tự).
  const missing = chosen.filter(item => !new RegExp(`\\[\\[${escapeRegExp(item.phrase)}\\]\\]`, 'i').test(safeExplanation));
  const added = missing.map(item => `[[${item.phrase}]]${item.vi ? ` (${item.vi})` : ''}`).join(' + ');
  return {
    phrases,
    source: keySource,
    recognition: added
      ? `${keySource === 'suggested' ? 'Cụm cần chú ý' : 'KEY xuất hiện trong đề'}: ${added}. ${safeExplanation}`
      : safeExplanation,
  };
}

function showExcelNote(text: string, max = 250): string {
  const compact = text.replace(/\s+/g, ' ').replace(/^[-•\s]+/, '').trim();
  if (compact.length <= max) return compact;
  // Never cut a word or leave the middle of a broken ellipsis.
  return compact.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

function BabokStudyGuidePanel({
  question,
  note,
  excelKnowledge,
  alignedKeys,
}: {
  question: Question;
  note?: LearningNote;
  selectedOptionId?: string;
  excelKnowledge?: ExcelKnowledge | null;
  alignedKeys?: QuestionKeyAlignment;
}) {
  const guide = buildBabokStudyGuide(question);
  const memory = buildMinimalBabokMemory(question, guide, note);
  const basicInsight = buildPracticalKeyInsight(question, guide, excelKnowledge);
  const contextual = buildFocusedExcelInsight(question, guide, excelKnowledge, basicInsight);
  const practical = contextual.insight;
  const curated = findCuratedQuestionInsight(question, excelKnowledge);
  const keyAlignment = alignedKeys || alignRecognitionToQuestion(question.text, practical);
  const correct = question.options.find(option => option.isCorrect);
  const isNegative = isNegativeExamQuestion(question.text);
  const sourceLine = contextual.source || (memory.section ? `BABOK ${memory.section}` : 'Nguồn cần đối chiếu');

  return (
    <div className="ccba-study-guide h-full min-h-0 overflow-y-auto px-4 py-3.5 xl:px-5">
      <div className="border-b border-white/10 pb-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-sky-300">KEY quyết định câu trả lời</p>
        <h3 className="break-words text-xl font-extrabold leading-snug text-slate-100 xl:text-[23px]">{correct?.text || 'Chưa có đáp án trong đề'}</h3>
        {note?.status === 'ready' && note.correctAnswerVi && (
          <p className="mt-1.5 text-xs leading-5 text-slate-400">{note.correctAnswerVi}</p>
        )}
        {note?.status === 'loading' && <p className="mt-1.5 text-xs text-slate-400">Đang dịch nghĩa đáp án…</p>}
      </div>

      <section className="ccba-study-section py-3.5">
        <h4 className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-100"><span className="ccba-step-num">01</span> Cách nhận diện</h4>
        {isNegative && <p className="mb-2 text-[12px] font-bold text-amber-300">NOT / EXCEPT / LEAST = tìm phương án ngoại lệ.</p>}
        {curated?.contentFormat === 'approved-structured-v1'
          ? renderStudyBlocks(curated.studyBlocks?.recognition, practical.clue)
          : <>
            <p className="ccba-key-link">{emphasizeBilingualKeys('**KEY trong đề:** ' + (keyAlignment.phrases.map(phrase => '[['+phrase+']]').join(' · ') || 'Đối chiếu nội dung câu hỏi'))}</p>
            {renderStudyBlocks(curated?.studyBlocks?.recognition, practical.clue)}
          </>}
      </section>

      <section className="ccba-study-section py-3.5">
        <h4 className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-100"><span className="ccba-step-num">02</span> Kiến thức nền cần nhớ</h4>
        {renderStudyBlocks(curated?.studyBlocks?.foundation, practical.principle)}
      </section>

      <section className="ccba-study-section py-3.5">
        <h4 className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-100"><span className="ccba-step-num">03</span> Dễ nhầm — Cách loại trừ</h4>
        {renderOptionReasons(question, curated?.optionReasons) || renderContrastParagraphs(practical.contrast, question, excelKnowledge, curated?.studyBlocks?.confusion)}
      </section>

      <div className="border-t border-white/10 py-3 text-[11px] leading-5 text-slate-400">
        <p>Nguồn học tham khảo: <span className="text-sky-300">{contextual.evidence?.directSupport && contextual.evidence.source ? contextual.evidence.source : sourceLine}</span></p>
        {contextual.evidence?.directSupport && contextual.evidence.excerpt && (
          <p className="mt-1.5 leading-5 text-slate-400">
            <span className="font-semibold text-sky-300">Đoạn tài liệu liên quan: </span>
            <span>“{contextual.evidence.excerpt}”</span>
          </p>
        )}
        {curated?.sourceQualification && <p className="mt-2 text-[11px] leading-5 text-slate-500">{curated.sourceQualification}</p>}
        {keyAlignment.source === 'suggested' && (
          <p className="mt-1 text-[10px] leading-4 text-slate-500">
            KEY xanh là cụm gợi ý trích từ đề; chưa xác minh riêng mức độ quyết định đáp án.
          </p>
        )}
        {contextual.reviewStatus ? (
          <p className={cn('mt-1', ['context', 'gap'].includes(contextual.coverageLevel || '') ? 'text-amber-300' : 'text-slate-400')}>
            Trạng thái nội dung: {contextual.reviewStatus}.
          </p>
        ) : !contextual.verified && (
          <p className="mt-1 text-amber-300">Chưa có lời giải riêng được đối chiếu đầy đủ. Hãy kiểm tra BABOK bên phải.</p>
        )}
      </div>
    </div>
  );
}

function BabokSourcePanel({ question }: { question: Question }) {
  const guide = buildBabokStudyGuide(question);
  const memory = buildMinimalBabokMemory(question, guide);
  const pdfPage = babokPdfPage(memory.bookPage);
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-slate-100">BABOK {memory.section} · {memory.title}</div>
          <div className="mt-0.5 text-[10px] text-slate-400">Trang PDF {pdfPage} · Tham khảo nội dung liên quan</div>
        </div>
        <a href={babokPdfHref(memory.bookPage)} target="_blank" rel="noreferrer" className="shrink-0 text-[11px] font-semibold text-sky-300 hover:underline">Mở lớn ↗</a>
      </header>
      <div className="min-h-0 flex-1">
        <BabokPdfCanvas key={`${question.id}-${pdfPage}`} pageNumber={pdfPage} compact />
      </div>
    </div>
  );
}

function ThemeController({
  isDarkMode,
  onToggle,
  inline = false,
}: {
  isDarkMode: boolean;
  onToggle: () => void;
  inline?: boolean;
}) {
  return (
    <>
      <style>{LIGHT_THEME_OVERRIDES + '\n.ccba-workspace .ccba-step-num { display:inline-flex; align-items:center; justify-content:center; width:24px; height:22px; border-radius:6px; background:#233e68; color:#9dc8ff; font-size:10px; font-weight:800; }\n.ccba-workspace .ccba-study-section + .ccba-study-section { border-top:1px solid rgba(148,163,184,.18); }\n.ccba-workspace .ccba-learning-key, .ccba-workspace .ccba-question-key { color:#79c8ff !important; font-weight:800; background:none !important; box-shadow:none !important; text-decoration:none !important; padding:0 !important; }\n.ccba-workspace.theme-light .ccba-learning-key, .ccba-workspace.theme-light .ccba-question-key { color:#0759aa !important; }\n.ccba-workspace.theme-light .ccba-step-num { background:#e4edfa; color:#1c5192; }\n.ccba-workspace .ccba-study-guide { scrollbar-width:thin; scrollbar-color:#475569 transparent; }\n.ccba-workspace .ccba-question-map { scrollbar-width:thin; scrollbar-color:#475569 transparent; }\n.ccba-workspace.theme-light .ccba-quiz-panel, .ccba-workspace.theme-light .ccba-study-panel, .ccba-workspace.theme-light .ccba-pdf-panel { background:#ffffff !important; border-color:#cbd5e1 !important; }\n.ccba-workspace.theme-light .ccba-study-guide h3, .ccba-workspace.theme-light .ccba-study-guide h4 { color:#16243d !important; }\n.ccba-workspace.theme-light .ccba-study-guide p.text-slate-300 { color:#37475e !important; }\n.ccba-workspace.theme-light .ccba-study-guide .text-slate-400 { color:#64748b !important; }\n.ccba-workspace.theme-light .ccba-study-guide .text-sky-300 { color:#0759aa !important; }\n.ccba-workspace.theme-light .ccba-study-guide .text-amber-300 { color:#92560d !important; }\n\n.ccba-workspace .ccba-study-guide .ccba-lesson-paragraph, .ccba-workspace .ccba-study-guide .ccba-lesson-insight, .ccba-workspace .ccba-study-guide .ccba-lesson-answer, .ccba-workspace .ccba-study-guide .ccba-lesson-tip, .ccba-workspace .ccba-study-guide .ccba-option-detail {font-size:13px;line-height:1.75;color:#cbd5e1;}\n.ccba-workspace .ccba-study-guide .ccba-lesson-paragraph + .ccba-lesson-paragraph, .ccba-workspace .ccba-study-guide .ccba-lesson-paragraph + .ccba-lesson-insight, .ccba-workspace .ccba-study-guide .ccba-lesson-insight + .ccba-lesson-paragraph, .ccba-workspace .ccba-study-guide .ccba-lesson-insight + .ccba-lesson-tip, .ccba-workspace .ccba-study-guide .ccba-lesson-process + .ccba-lesson-paragraph {margin-top:11px;}\n.ccba-workspace .ccba-study-guide .ccba-lesson-insight {margin:10px 0;padding:10px 12px;border-left:3px solid #38bdf8;background:rgba(56,189,248,.09);border-radius:0 8px 8px 0;}\n.ccba-workspace .ccba-study-guide .ccba-lesson-answer {margin-top:11px;border:1px solid rgba(52,211,153,.34);background:rgba(16,185,129,.10);border-radius:8px;padding:10px 12px;font-weight:600;}\n.ccba-workspace .ccba-study-guide .ccba-lesson-tip {margin-top:11px;padding:10px 12px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.22);border-radius:8px;}\n.ccba-workspace .ccba-study-guide .ccba-lesson-process {margin:10px 0;padding:11px;background:rgba(148,163,184,.10);border-radius:8px;}\n.ccba-workspace .ccba-study-guide .ccba-lesson-process-caption {display:block;font-size:9px;letter-spacing:.1em;font-weight:800;color:#94a3b8;margin-bottom:7px;}\n.ccba-workspace .ccba-study-guide .ccba-lesson-process-steps {display:flex;align-items:center;flex-wrap:wrap;gap:6px;}\n.ccba-workspace .ccba-study-guide .ccba-lesson-process-step {border:1px solid rgba(148,163,184,.3);border-radius:6px;padding:5px 7px;font-size:11px;font-weight:700;color:#b9d5fa;}\n.ccba-workspace .ccba-study-guide .ccba-lesson-arrow {font-size:11px;color:#94a3b8;}\n.ccba-workspace .ccba-study-guide .ccba-key-link {font-size:11px;line-height:1.6;margin-bottom:10px;color:#a8bedb;}\n.ccba-workspace .ccba-study-guide .ccba-option-reason-list {display:flex;flex-direction:column;gap:9px;}\n.ccba-workspace .ccba-study-guide .ccba-option-reason {border:1px solid rgba(148,163,184,.24);border-radius:9px;padding:9px 11px;background:rgba(148,163,184,.06);}\n.ccba-workspace .ccba-study-guide .ccba-option-reason-correct {border-color:rgba(16,185,129,.45);background:rgba(16,185,129,.08);}\n.ccba-workspace .ccba-study-guide .ccba-option-head {display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;}\n.ccba-workspace .ccba-study-guide .ccba-option-letter {min-width:23px;width:23px;height:23px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:rgba(148,163,184,.22);font-weight:800;font-size:11px;}\n.ccba-workspace .ccba-study-guide .ccba-option-title {flex:1;line-height:1.5;font-size:12px;font-weight:700;}\n.ccba-workspace .ccba-study-guide .ccba-option-correct-tag {color:#34d399;white-space:nowrap;font-size:10px;font-weight:800;}\n.ccba-workspace.theme-light .ccba-study-guide .ccba-lesson-paragraph,.ccba-workspace.theme-light .ccba-study-guide .ccba-lesson-insight,.ccba-workspace.theme-light .ccba-study-guide .ccba-lesson-tip,.ccba-workspace.theme-light .ccba-study-guide .ccba-lesson-answer,.ccba-workspace.theme-light .ccba-study-guide .ccba-option-detail {color:#34435b;}\n.ccba-workspace.theme-light .ccba-study-guide .ccba-option-title {color:#1b2b45;}\n.ccba-workspace.theme-light .ccba-study-guide .ccba-lesson-insight {background:#eff7ff;border-color:#1680d7;}\n.ccba-workspace.theme-light .ccba-study-guide .ccba-lesson-answer {background:#edfdf6;border-color:#6ddcaa;}\n.ccba-workspace.theme-light .ccba-study-guide .ccba-lesson-tip {background:#f2f7ff;border-color:#cadaf8;}\n.ccba-workspace.theme-light .ccba-study-guide .ccba-lesson-process {background:#f0f4fa;}\n.ccba-workspace.theme-light .ccba-study-guide .ccba-lesson-process-step {color:#204b84;border-color:#cbd5e1;}\n.ccba-workspace.theme-light .ccba-study-guide .ccba-option-reason {background:#f8fafc;border-color:#dbe3ec;}\n.ccba-workspace.theme-light .ccba-study-guide .ccba-option-reason-correct {background:#eafbf3;border-color:#82e3b8;}\n.ccba-workspace.theme-light .ccba-study-guide .ccba-option-correct-tag {color:#047857;}\n.ccba-workspace.theme-light .ccba-study-guide .ccba-key-link {color:#586b86;}\n@media(min-width:1024px) { .ccba-workspace { height:100dvh; overflow:hidden; } .ccba-workspace .ccba-three-pane { min-height:0; } }\n'}</style>
      <button
        type="button"
        onClick={onToggle}
        aria-label={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
        title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
        className={cn(
          inline ? 'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition' :
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
  const [questionMapOpen, setQuestionMapOpen] = useState(false);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [learningNotes, setLearningNotes] = useState<Record<string, LearningNote>>({});
  const [questionTranslations, setQuestionTranslations] = useState<
    Record<string, { status: 'loading' | 'ready' | 'error'; text: string }>
  >({});
  const questionPaneRef = React.useRef<HTMLElement>(null);
  const questionNavRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const nav = questionNavRef.current;
    const selected = nav?.querySelector<HTMLButtonElement>(`button[data-question-index="${currentIndex}"]`);
    if (nav && selected) {
      const offset = selected.offsetTop - nav.offsetTop;
      if (offset < nav.scrollTop || offset + selected.offsetHeight > nav.scrollTop + nav.clientHeight) {
        nav.scrollTop = Math.max(0, offset - nav.clientHeight / 2);
      }
    }
  }, [currentIndex,session?.setId]);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(true);
  const [isLoadingBabokData, setIsLoadingBabokData] = useState(true);
  const [babokDataError, setBabokDataError] = useState('');
  const [excelKnowledge, setExcelKnowledge] = useState<ExcelKnowledge | null>(null);
  const [excelLoadError, setExcelLoadError] = useState('');
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
    let active = true;
    const url = publicFilePath('ccba-excel-knowledge.json');
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error('Không tìm thấy ccba-excel-knowledge.json trong public');
        return response.json() as Promise<ExcelKnowledge>;
      })
      .then((data) => {
        if (!active) return;
        setExcelKnowledge(data);
        setExcelLoadError('');
      })
      .catch((error) => {
        if (!active) return;
        setExcelLoadError(error instanceof Error ? error.message : 'Không tải được ghi chú Excel.');
      });
    return () => { active = false; };
  }, []);

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
    if (!session) return { correct: 0, wrong: 0, answered: 0, total: 0, percent: 0, unanswered: 0 };

    const correct = session.questions.filter((question) => {
      const picked = session.answers[question.id];
      return question.options.find((option) => option.id === picked)?.isCorrect;
    }).length;

    const total = session.questions.length;
    const unanswered = session.questions.filter(
      (question) => !session.answers[question.id]
    ).length;
    const answered = total - unanswered;
    const wrong = answered - correct;
    const percent = total ? Math.round((correct / total) * 100) : 0;

    return { correct, wrong, answered, total, percent, unanswered };
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

  const translateQuestionOnly = async (question: Question) => {
    const stored = questionTranslations[question.id];
    if (stored?.status === 'ready' || stored?.status === 'loading') return;

    setQuestionTranslations((current) => ({
      ...current,
      [question.id]: { status: 'loading', text: '' },
    }));
    try {
      const text = await translateEnglishToVietnamese(question.text);
      setQuestionTranslations((current) => ({
        ...current,
        [question.id]: { status: 'ready', text },
      }));
    } catch {
      setQuestionTranslations((current) => ({
        ...current,
        [question.id]: {
          status: 'error',
          text: 'Chưa dịch được câu hỏi. Bạn vẫn có thể làm bài bằng tiếng Anh.',
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

const pdfPageParam =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('babokPage')
    : null;

const requestedPdfPage =
  pdfPageParam !== null ? Number(pdfPageParam) : NaN;

if (
  Number.isInteger(requestedPdfPage) &&
  requestedPdfPage >= 1
) {
  return (
    <div className="min-h-screen bg-slate-950 p-3">
      <div className="mb-3 flex items-center justify-between rounded-xl border border-white/10 p-3 text-white">
        <h1 className="font-bold">
          BABOK v3 — Trang PDF {requestedPdfPage}
        </h1>

        <a
          href={import.meta.env.BASE_URL || '/'}
          className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950"
        >
          Về ứng dụng
        </a>
      </div>

      <BabokPdfCanvas
        pageNumber={requestedPdfPage}
        fullScreen={true}
      />
    </div>
  );
}

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
  // Một phép phân tích chung cho cột Câu hỏi và cột Học KEY.
  const currentKeyAlignment = (hasAnsweredCurrent || session.submitted)
    ? (() => {
        const guide = buildBabokStudyGuide(currentQuestion);
        const basic = buildPracticalKeyInsight(currentQuestion, guide, excelKnowledge);
        const focused = buildFocusedExcelInsight(currentQuestion, guide, excelKnowledge, basic);
        return alignRecognitionToQuestion(currentQuestion.text, focused.insight);
      })()
    : null;

  const goToQuestion = (nextIndex: number) => {
    const safeIndex = Math.max(
      0,
      Math.min(session.questions.length - 1, nextIndex)
    );

    setCurrentIndex(safeIndex);
    setQuestionMapOpen(false);
    questionPaneRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    scrollToPageTop();
  };

  return (
    <div className={appThemeClass('ccba-workspace min-h-screen bg-slate-950 text-slate-100')}>
      <div className="mx-auto flex min-h-0 max-w-[1880px] flex-col px-2.5 py-2 md:px-3 lg:h-full">

        <div className="mb-2 flex shrink-0 flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 sm:flex-row sm:items-center sm:justify-between">
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
              Đang xem câu {currentIndex + 1}/{session.questions.length} · Đã làm {score.answered}/{score.total} ({progress}%)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div aria-label="Thống kê làm bài" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-xs">
              <span className="text-slate-200">Tổng <strong className="text-white">{score.total}</strong></span>
              <span className="text-emerald-200">Đúng <strong>{score.correct}</strong></span>
              <span className="text-rose-200">Sai <strong>{score.wrong}</strong></span>
              <span className="text-amber-200">Chưa làm <strong>{score.unanswered}</strong></span>
              {session.submitted && <span className="font-semibold text-cyan-200">{score.percent}%</span>}
            </div>
            <ThemeController isDarkMode={isDarkMode} onToggle={toggleTheme} inline />
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

        <div className="ccba-three-pane grid gap-2 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <main ref={questionPaneRef} className="ccba-quiz-panel min-w-0 min-h-0 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.04] p-4 md:p-5">
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

            <h2 className="mt-4 whitespace-pre-line text-[15px] font-semibold leading-[1.8] md:text-[16px]">
              {(hasAnsweredCurrent || session.submitted)
                ? highlightLearningKeywords(currentQuestion.text, currentKeyAlignment?.phrases || [])
                : currentQuestion.text}
            </h2>

            {!hasAnsweredCurrent && !session.submitted && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => void translateQuestionOnly(currentQuestion)}
                  disabled={questionTranslations[currentQuestion.id]?.status === 'loading'}
                  className="text-xs font-medium text-cyan-200 hover:underline disabled:opacity-50"
                >
                  {questionTranslations[currentQuestion.id]?.status === 'loading'
                    ? 'Đang dịch câu hỏi...'
                    : questionTranslations[currentQuestion.id]?.status === 'ready'
                    ? 'Đã dịch câu hỏi'
                    : 'Dịch câu hỏi sang tiếng Việt'}
                </button>
                {questionTranslations[currentQuestion.id]?.text && (
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {questionTranslations[currentQuestion.id].text}
                  </p>
                )}
              </div>
            )}

            {(hasAnsweredCurrent || session.submitted) && currentLearningNote?.status === 'ready' && (
              <p className="mt-3 text-sm leading-6 text-slate-300">
                <span className="font-semibold text-cyan-200">Dịch:</span>{' '}
                {currentLearningNote.questionVi}
              </p>
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
              <span className="text-[11px] text-slate-400">{answeredCount}/{session.questions.length} đã làm</span>
              <button
                onClick={() => goToQuestion(currentIndex + 1)}
                disabled={currentIndex === session.questions.length - 1}
                className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Câu tiếp <span className="ml-1 text-[10px] opacity-60">Enter</span>
              </button>
            </div>
          </main>

          <section className="ccba-study-panel min-h-[360px] min-w-0 overflow-hidden rounded-xl lg:min-h-0 border border-white/10 bg-white/[0.04]">
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b border-white/10 px-4 py-3 text-xs font-bold text-slate-200">02 — Học KEY từ Excel <span className="ml-1 text-[10px] font-normal text-slate-400">Nhận diện · Ghi nhớ · Loại trừ</span></div>
              <div className="min-h-0 flex-1">
                {excelLoadError && <p className="px-4 pt-2 text-xs text-amber-200">{excelLoadError} — phần KEY cơ bản vẫn hoạt động.</p>}
                {(hasAnsweredCurrent || session.submitted) ? (
                  <BabokStudyGuidePanel question={currentQuestion} note={currentLearningNote} excelKnowledge={excelKnowledge} selectedOptionId={currentPickedId} alignedKeys={currentKeyAlignment || undefined} />
                ) : (
                  <div className="px-5 py-6 text-sm leading-7 text-slate-400">Sau khi trả lời, vùng này sẽ hiện <strong className="text-sky-300">KEY quyết định</strong>, cách nhận diện trong đề, kiến thức nền và các đáp án dễ nhầm.</div>
                )}
              </div>
            </div>
          </section>
          <aside className="ccba-pdf-panel min-h-0 min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
            <div className="border-b border-white/10 px-3 py-3 text-xs font-bold text-slate-200">03 — Tài liệu BABOK</div>
            <div className="h-[480px] min-h-0 sm:h-[580px] lg:h-[calc(100%-41px)]">
              <BabokSourcePanel question={currentQuestion} />
            </div>
          </aside>
        </div>
        <nav aria-label="Trạng thái từng câu và điều hướng" className="ccba-question-nav relative mt-2 shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
          {questionMapOpen && (
            <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-30 overflow-hidden rounded-xl border border-white/20 bg-slate-900 p-3 shadow-2xl">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-200"><span>Tất cả {session.questions.length} câu · Bấm số để xem lại</span><button onClick={() => setQuestionMapOpen(false)} className="rounded border border-white/20 px-2 py-1">Đóng ✕</button></div>
              <div ref={questionNavRef} className="ccba-question-map grid max-h-[min(58vh,430px)] grid-cols-8 gap-1.5 overflow-y-auto sm:grid-cols-12 lg:grid-cols-20">
                {session.questions.map((q,index) => {
                  const picked = session.answers[q.id];
                  const isRight = Boolean(q.options.find(option => option.id === picked)?.isCorrect);
                  const status = !picked ? 'Chưa làm' : isRight ? 'Đúng' : 'Sai';
                  return <button key={q.id} type="button" data-question-index={index} onClick={() => goToQuestion(index)} title={`Câu ${index+1}: ${status}`}
                    aria-current={currentIndex===index ? 'step' : undefined}
                    className={cn('h-8 rounded-md border text-[11px] font-semibold transition hover:brightness-125',
                      !picked && 'border-white/10 bg-slate-700/70 text-slate-200',
                      picked && isRight && 'border-emerald-500/50 bg-emerald-500/25 text-emerald-100',
                      picked && !isRight && 'border-rose-500/50 bg-rose-500/25 text-rose-100',
                      currentIndex===index && 'ring-2 ring-sky-300')}>{index+1}</button>;
                })}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => goToQuestion(currentIndex-1)} disabled={currentIndex===0} aria-label="Câu trước" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs disabled:opacity-30">‹</button>
              <span className="min-w-[65px] text-center text-xs font-bold text-slate-100">{currentIndex+1}/{session.questions.length}</span>
              <button onClick={() => goToQuestion(currentIndex+1)} disabled={currentIndex===session.questions.length-1} aria-label="Câu tiếp" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs disabled:opacity-30">›</button>
              <div className="ml-2 hidden flex-wrap gap-1 md:flex">
                {session.questions.slice(Math.max(0,Math.min(session.questions.length-15,currentIndex-7)),Math.max(0,Math.min(session.questions.length-15,currentIndex-7))+15).map(q => {
                  const index=session.questions.indexOf(q);
                  const picked=session.answers[q.id];
                  const isRight=Boolean(q.options.find(opt=>opt.id===picked)?.isCorrect);
                  return <button key={q.id} onClick={() => goToQuestion(index)} title={`Câu ${index+1}: ${!picked?'Chưa làm':isRight?'Đúng':'Sai'}`}
                    className={cn('h-7 min-w-[27px] rounded border text-[10px] font-semibold',
                    !picked && 'border-white/10 bg-slate-700/60 text-slate-200',
                    picked && isRight && 'border-emerald-400/60 bg-emerald-500/25 text-emerald-100',
                    picked && !isRight && 'border-rose-400/60 bg-rose-500/25 text-rose-100',
                    currentIndex===index && 'ring-2 ring-sky-300')}>{index+1}</button>;
                })}
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-300">
              <span className="hidden sm:inline"><span className="text-emerald-300">●</span> Đúng</span>
              <span className="hidden sm:inline"><span className="text-rose-300">●</span> Sai</span>
              <span className="hidden sm:inline"><span className="text-slate-400">●</span> Chưa làm</span>
              <button onClick={() => setQuestionMapOpen(open=>!open)} aria-expanded={questionMapOpen} className="rounded-lg bg-sky-100 px-3 py-1.5 text-[11px] font-bold text-slate-900 hover:bg-white">{questionMapOpen?'Thu gọn':'Tất cả câu'}</button>
            </div>
          </div>
        </nav>

      </div>
    </div>
  );
}
