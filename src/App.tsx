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
  RotateCcw,
  Search,
  Shuffle,
  Trophy,
  XCircle,
} from 'lucide-react';

type RawSet = {
  id: string;
  title: string;
  fileName: string;
  raw: string;
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

const STORAGE_VERSION = 1;
const STORAGE_KEY = `ccba-practice-quiz-storage-v${STORAGE_VERSION}`;

const DEMO_RAW_SETS: RawSet[] = [
  {
    id: 'demo-1',
    title: 'Bộ mẫu - Import file .txt để tạo bộ đề',
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
  const [initialSavedStorage] = useState<SavedQuizStorage | null>(() =>
    loadSavedQuizStorage()
  );

  const [rawSets, setRawSets] = useState<RawSet[]>(
    () => initialSavedStorage?.rawSets || DEMO_RAW_SETS
  );

  const [selectedSetId, setSelectedSetId] = useState(() => {
    if (!initialSavedStorage) return 'demo-1';

    const selectedExists =
      initialSavedStorage.selectedSetId === 'all' ||
      initialSavedStorage.rawSets.some(
        (set) => set.id === initialSavedStorage.selectedSetId
      );

    return selectedExists
      ? initialSavedStorage.selectedSetId
      : initialSavedStorage.rawSets[0]?.id || 'demo-1';
  });

  const [questionLimit, setQuestionLimit] = useState(
    () => initialSavedStorage?.questionLimit || 'all'
  );

  const [search, setSearch] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [hasSavedData, setHasSavedData] = useState(() =>
    Boolean(initialSavedStorage)
  );

  const [importStatus, setImportStatus] = useState(() => {
    if (initialSavedStorage) {
      return `Đã tải lại ${initialSavedStorage.rawSets.length} file đã lưu trên trình duyệt. Lưu gần nhất: ${formatSavedTime(
        initialSavedStorage.updatedAt
      )}.`;
    }

    return 'Đang dùng bộ mẫu. Import bao nhiêu file .txt thì tạo bấy nhiêu bộ đề riêng và thêm 1 bộ tổng hợp.';
  });

  useEffect(() => {
    if (!hasSavedData) return;

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
          ? 'Dữ liệu đã được lưu trên trình duyệt, lần sau mở lại web sẽ còn.'
          : 'Chưa lưu được vào trình duyệt, có thể localStorage đã đầy hoặc bị chặn.'
      }`
    );
  };

  const resetToDemo = () => {
    clearQuizStorage();
    setHasSavedData(false);
    setRawSets(DEMO_RAW_SETS);
    setSelectedSetId('demo-1');
    setSession(null);
    setCurrentIndex(0);
    setImportStatus(
      'Đã xóa dữ liệu đã lưu và quay lại bộ mẫu. Import file mới thì app sẽ lưu lại để lần sau vào học tiếp.'
    );
  };

  const selectAnswer = (questionId: string, optionId: string) => {
    if (!session || session.answers[questionId]) return;
    setSession({
      ...session,
      answers: { ...session.answers, [questionId]: optionId },
    });
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
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                  App không nhúng sẵn dữ liệu dài vào code. Bạn import bao nhiêu
                  file .txt thì hệ thống tạo bấy nhiêu bộ đề riêng, rồi thêm 1
                  bộ cuối tổng hợp toàn bộ câu hỏi.
                </p>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-100">
                        Import dữ liệu câu hỏi
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {importStatus}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Dữ liệu được lưu trong trình duyệt hiện tại. Nếu đổi máy,
                        đổi trình duyệt hoặc xóa cache/localStorage thì cần import
                        lại file.
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
                        onClick={resetToDemo}
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
                      >
                        Xóa dữ liệu & dùng mẫu
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
                Import bao nhiêu file thì có bấy nhiêu bộ riêng, cộng thêm 1 bộ
                cuối tổng hợp.
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
              <button
                key={set.id}
                onClick={() => setSelectedSetId(set.id)}
                onDoubleClick={() => startQuiz(set.id)}
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
                  <div className="rounded-full bg-slate-950/70 px-3 py-1 text-sm text-slate-300">
                    {set.questions.length} câu
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold leading-6 text-slate-100">
                  {set.title}
                </h3>
                <p className="mt-2 text-sm text-slate-400">{set.fileName}</p>
                <p className="mt-1 text-sm text-slate-500">{set.description}</p>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    Bấm để chọn, bấm đúp để làm ngay
                  </span>
                  <ArrowRight className="h-4 w-4 text-cyan-200 transition group-hover:translate-x-1" />
                </div>
              </button>
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <button
              onClick={resetToHome}
              className="mb-2 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Về danh sách bộ đề
            </button>
            <h1 className="text-xl font-bold md:text-2xl">
              {session.setTitle}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Đã chọn {answeredCount}/{session.questions.length} câu · Tiến độ{' '}
              {progress}%
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => startQuiz(session.setId)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" /> Làm lại & trộn mới
            </button>
            <button
              onClick={submitQuiz}
              disabled={session.submitted}
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trophy className="h-4 w-4" /> Nộp bài
            </button>
          </div>
        </div>

        {session.submitted && (
          <section className="mb-5 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-5 shadow-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-100">
                  Kết quả
                </p>
                <h2 className="mt-1 text-3xl font-bold">
                  {score.correct}/{score.total} câu đúng · {score.percent}%
                </h2>
                <p className="mt-2 text-slate-300">
                  Còn {score.unanswered} câu chưa chọn. Bên dưới có phần rà soát
                  đáp án đúng/sai.
                </p>
              </div>
              <button
                onClick={() => startQuiz(session.setId)}
                className="rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-100"
              >
                Làm lại bộ này
              </button>
            </div>
          </section>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <main className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-sm text-slate-400">
                  Câu {currentIndex + 1}/{session.questions.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Nguồn: {currentQuestion.sourceTitle} · Câu gốc{' '}
                  {currentQuestion.originalNumber}
                </p>
              </div>
              <div className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-300">
                {hasAnsweredCurrent
                  ? currentAnswerIsCorrect
                    ? 'Đã chọn · Đúng'
                    : 'Đã chọn · Sai'
                  : 'Chưa chọn'}
              </div>
            </div>

            <h2 className="mt-6 whitespace-pre-line text-xl font-semibold leading-8 md:text-2xl">
              {currentQuestion.text}
            </h2>

            <div className="mt-6 grid gap-3">
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
                      'flex items-start gap-4 rounded-2xl border p-4 text-left transition disabled:cursor-default',
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
                        'border-white/10 bg-slate-900/60 opacity-80'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
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
                    <span className="flex-1 whitespace-pre-line leading-7 text-slate-100">
                      {option.text}
                    </span>
                    {showCorrect && (
                      <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-300" />
                    )}
                    {showWrong && (
                      <XCircle className="mt-1 h-5 w-5 text-rose-300" />
                    )}
                  </button>
                );
              })}
            </div>

            {hasAnsweredCurrent && (
              <div
                className={cn(
                  'mt-5 rounded-3xl border p-5 shadow-xl',
                  currentAnswerIsCorrect
                    ? 'border-emerald-300/40 bg-emerald-300/10'
                    : 'border-rose-300/40 bg-rose-300/10'
                )}
              >
                <div className="flex items-start gap-3">
                  {currentAnswerIsCorrect ? (
                    <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-emerald-300" />
                  ) : (
                    <XCircle className="mt-1 h-6 w-6 shrink-0 text-rose-300" />
                  )}
                  <div>
                    <p className="text-lg font-bold">
                      {currentAnswerIsCorrect ? 'Đúng rồi!' : 'Sai rồi!'}
                    </p>
                    <p className="mt-2 leading-7 text-slate-200">
                      Bạn đã chọn:{' '}
                      <span
                        className={
                          currentAnswerIsCorrect
                            ? 'font-semibold text-emerald-300'
                            : 'font-semibold text-rose-300'
                        }
                      >
                        {currentPickedOption?.text}
                      </span>
                    </p>
                    <p className="mt-1 leading-7 text-slate-200">
                      Đáp án đúng là:{' '}
                      <span className="font-semibold text-emerald-300">
                        {currentCorrectLabel}. {currentCorrectOption?.text}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Câu trước
              </button>
              <div className="text-center text-sm text-slate-400">
                Đáp án được xáo trộn riêng cho lượt làm bài này
              </div>
              <button
                onClick={() =>
                  setCurrentIndex(
                    Math.min(session.questions.length - 1, currentIndex + 1)
                  )
                }
                disabled={currentIndex === session.questions.length - 1}
                className="rounded-2xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Câu tiếp
              </button>
            </div>
          </main>

          <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl lg:sticky lg:top-4 lg:h-fit">
            <h3 className="font-semibold">Bảng câu hỏi</h3>
            <div className="mt-4 grid max-h-[560px] grid-cols-5 gap-2 overflow-auto pr-1">
              {session.questions.map((question, index) => {
                const picked = session.answers[question.id];
                const correct = question.options.find(
                  (option) => option.id === picked
                )?.isCorrect;
                return (
                  <button
                    key={question.id}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      'h-10 rounded-xl text-sm font-semibold transition',
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
            <div className="mt-4 space-y-2 text-sm text-slate-400">
              <p>
                <span className="inline-block h-3 w-3 rounded bg-white/10 align-middle" />{' '}
                Chưa làm
              </p>
              <p>
                <span className="inline-block h-3 w-3 rounded bg-emerald-300 align-middle" />{' '}
                Đúng
              </p>
              <p>
                <span className="inline-block h-3 w-3 rounded bg-rose-300 align-middle" />{' '}
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
