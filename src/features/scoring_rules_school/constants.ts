// src/features/scoring_rules_school/constants.ts
//
// Giá trị conditionType/actionType/severity khớp 1-1 với enum Java thật:
// ScoringRuleConditionType, ScoringRuleActionType, ScoringRuleSeverity.

export type ScoringRuleParamField = {
  name: string;
  label: string;
  type: 'text' | 'number' | 'decimal';
  placeholder?: string;
};

export type ScoringRuleTypeOption = {
  value: string;
  label: string;
  fields: ScoringRuleParamField[];
};

const SECONDS_FIELD: ScoringRuleParamField = { name: 'seconds', label: 'Số giây', type: 'number' };
const WORDS_FIELD: ScoringRuleParamField = { name: 'words', label: 'Số từ', type: 'number' };
const CRITERION_CODE_FIELD: ScoringRuleParamField = { name: 'criterionCode', label: 'Mã tiêu chí', type: 'text' };
const SCORE_FIELD: ScoringRuleParamField = { name: 'score', label: 'Điểm', type: 'decimal' };
const BAND_CODE_FIELD: ScoringRuleParamField = { name: 'bandCode', label: 'Mã band', type: 'text' };
const RATIO_FIELD: ScoringRuleParamField = { name: 'ratio', label: 'Tỉ lệ (0-1)', type: 'decimal', placeholder: '0.0 - 1.0' };
const CONFIDENCE_FIELD: ScoringRuleParamField = { name: 'confidence', label: 'Độ tin cậy (0-1)', type: 'decimal', placeholder: '0.0 - 1.0' };
const WORDS_PER_MINUTE_FIELD: ScoringRuleParamField = { name: 'wordsPerMinute', label: 'Từ/phút', type: 'decimal' };

export const CONDITION_TYPE_OPTIONS: ScoringRuleTypeOption[] = [
  { value: 'DURATION_LESS_THAN', label: 'Thời lượng nhỏ hơn (giây)', fields: [SECONDS_FIELD] },
  { value: 'DURATION_GREATER_THAN', label: 'Thời lượng lớn hơn (giây)', fields: [SECONDS_FIELD] },

  { value: 'WORD_COUNT_LESS_THAN', label: 'Số từ nhỏ hơn', fields: [WORDS_FIELD] },
  { value: 'WORD_COUNT_GREATER_THAN', label: 'Số từ lớn hơn', fields: [WORDS_FIELD] },

  { value: 'CRITERION_SCORE_LESS_THAN', label: 'Điểm tiêu chí nhỏ hơn', fields: [CRITERION_CODE_FIELD, SCORE_FIELD] },
  { value: 'CRITERION_SCORE_GREATER_THAN', label: 'Điểm tiêu chí lớn hơn', fields: [CRITERION_CODE_FIELD, SCORE_FIELD] },
  { value: 'CRITERION_BAND_AT_OR_BELOW', label: 'Band tiêu chí ở mức hoặc thấp hơn', fields: [CRITERION_CODE_FIELD, BAND_CODE_FIELD] },
  { value: 'CRITERION_BAND_AT_OR_ABOVE', label: 'Band tiêu chí ở mức hoặc cao hơn', fields: [CRITERION_CODE_FIELD, BAND_CODE_FIELD] },

  { value: 'FINAL_SCORE_LESS_THAN', label: 'Điểm tổng nhỏ hơn', fields: [SCORE_FIELD] },
  { value: 'FINAL_SCORE_GREATER_THAN', label: 'Điểm tổng lớn hơn', fields: [SCORE_FIELD] },

  { value: 'TASK_RELEVANCE_LESS_THAN', label: 'Độ liên quan chủ đề (relevance) nhỏ hơn', fields: [RATIO_FIELD] },
  { value: 'OFF_TOPIC_RATIO_GREATER_THAN', label: 'Tỉ lệ lạc đề (off-topic) lớn hơn', fields: [RATIO_FIELD] },

  { value: 'CODE_SWITCHING_RATIO_GREATER_THAN', label: 'Tỉ lệ chuyển đổi ngôn ngữ (code-switching) lớn hơn', fields: [RATIO_FIELD] },

  { value: 'ASR_CONFIDENCE_LESS_THAN', label: 'Độ tin cậy nhận diện giọng nói (ASR) nhỏ hơn', fields: [CONFIDENCE_FIELD] },
  { value: 'AI_CONFIDENCE_LESS_THAN', label: 'Độ tự tin của AI chấm điểm nhỏ hơn', fields: [CONFIDENCE_FIELD] },
  { value: 'AUDIO_QUALITY_LESS_THAN', label: 'Chất lượng âm thanh nhỏ hơn', fields: [CONFIDENCE_FIELD] },

  { value: 'SILENCE_RATIO_GREATER_THAN', label: 'Tỉ lệ khoảng lặng (silence) lớn hơn', fields: [RATIO_FIELD] },
  { value: 'SPEECH_RATE_LESS_THAN', label: 'Tốc độ nói nhỏ hơn (từ/phút)', fields: [WORDS_PER_MINUTE_FIELD] },
  { value: 'SPEECH_RATE_GREATER_THAN', label: 'Tốc độ nói lớn hơn (từ/phút)', fields: [WORDS_PER_MINUTE_FIELD] },
];

const MAX_SCORE_FIELD: ScoringRuleParamField = { name: 'maxScore', label: 'Điểm tối đa', type: 'decimal' };
const DELTA_FIELD: ScoringRuleParamField = { name: 'delta', label: 'Delta (âm = trừ)', type: 'decimal' };
// reasonCode ở đây là lý do (text) chứ không phải mã phân loại, message là mô tả chi tiết đi kèm lý do đó.
const REASON_FIELD: ScoringRuleParamField = { name: 'reasonCode', label: 'Lý do', type: 'text' };
const REASON_DESCRIPTION_FIELD: ScoringRuleParamField = { name: 'message', label: 'Mô tả chi tiết', type: 'text' };
// message của feedback tag là thông điệp hiển thị cho học viên, khác ngữ nghĩa với REASON_DESCRIPTION_FIELD.
const FEEDBACK_MESSAGE_FIELD: ScoringRuleParamField = { name: 'message', label: 'Thông điệp', type: 'text' };

export const ACTION_TYPE_OPTIONS: ScoringRuleTypeOption[] = [
  { value: 'CAP_FINAL_SCORE', label: 'Giới hạn điểm tổng tối đa', fields: [MAX_SCORE_FIELD] },
  { value: 'CAP_CRITERION_SCORE', label: 'Giới hạn điểm tiêu chí tối đa', fields: [CRITERION_CODE_FIELD, MAX_SCORE_FIELD] },

  { value: 'ADD_FINAL_SCORE_DELTA', label: 'Cộng/trừ điểm tổng', fields: [DELTA_FIELD] },
  { value: 'ADD_CRITERION_SCORE_DELTA', label: 'Cộng/trừ điểm tiêu chí', fields: [CRITERION_CODE_FIELD, DELTA_FIELD] },

  { value: 'CAP_FRAMEWORK_RESULT_BAND', label: 'Giới hạn Band kết quả tối đa', fields: [{ name: 'maxResultBandId', label: 'ID Framework Result Band tối đa', type: 'text' }] },
  { value: 'SET_FRAMEWORK_RESULT_BAND', label: 'Ấn định Band kết quả', fields: [{ name: 'frameworkResultBandId', label: 'ID Framework Result Band', type: 'text' }] },

  { value: 'REQUIRE_HUMAN_REVIEW', label: 'Yêu cầu review thủ công', fields: [REASON_FIELD] },
  { value: 'MARK_RESPONSE_INVALID', label: 'Đánh dấu câu trả lời không hợp lệ', fields: [REASON_FIELD, REASON_DESCRIPTION_FIELD] },
  { value: 'REQUIRE_RETAKE', label: 'Yêu cầu làm lại bài', fields: [REASON_FIELD, REASON_DESCRIPTION_FIELD] },

  { value: 'ADD_FEEDBACK_TAG', label: 'Gắn tag feedback', fields: [{ name: 'tagCode', label: 'Mã tag', type: 'text' }, FEEDBACK_MESSAGE_FIELD] },
  { value: 'ADD_REVIEW_REASON', label: 'Ghi lý do review', fields: [REASON_FIELD, REASON_DESCRIPTION_FIELD] },
];

export const SEVERITY_OPTIONS = [
  { value: 'INFO', label: 'Thông tin' },
  { value: 'WARNING', label: 'Cảnh báo' },
  { value: 'BLOCKING', label: 'Chặn (Blocking)' },
];

// Form giữ giá trị param dạng string (raw input) rồi convert đúng kiểu khi submit,
// và convert ngược lại khi load dữ liệu có sẵn (Update) từ params đã parse.
export function buildParamsValue(fields: ScoringRuleParamField[], raw: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = raw[field.name] ?? '';
    if (field.type === 'number') {
      result[field.name] = value === '' ? 0 : parseInt(value, 10);
    } else if (field.type === 'decimal') {
      result[field.name] = value === '' ? 0 : Number(value);
    } else {
      result[field.name] = value;
    }
  }
  return result;
}

export function paramsToRawValues(fields: ScoringRuleParamField[], params: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of fields) {
    const value = params[field.name];
    result[field.name] = value === undefined || value === null ? '' : String(value);
  }
  return result;
}
