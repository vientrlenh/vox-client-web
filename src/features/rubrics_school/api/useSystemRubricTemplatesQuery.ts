// src/features/rubrics/api/useSystemRubricTemplatesQuery.ts

import { useQuery } from '@tanstack/react-query';
import { graphQLRequest } from '@/shared/api/graphqlClient';
import type { Rubric, RubricCriterion, RubricResultBand, RubricVersion } from '../types';

export const systemRubricTemplateKeys = {
  all: ['system-rubric-templates'] as const,
  lists: () => [...systemRubricTemplateKeys.all, 'list'] as const,
  list: (filter: unknown, page: number, size: number) =>
    [...systemRubricTemplateKeys.lists(), filter, page, size] as const,
  versions: (rubricId: string) => [...systemRubricTemplateKeys.all, 'versions', rubricId] as const,
};

export type SearchRubricTemplateFilter = {
  keyword?: string | null;
  frameworkId?: string | null;
  languageId?: string | null;
};

/**
 * Bộ tiêu chí mẫu của hệ thống, kèm SỐ phiên bản đã ban hành.
 *
 * Chỉ lấy `totalElements` chứ không lấy nội dung phiên bản: ở màn danh sách ta chỉ cần biết bản mẫu
 * này có gì để sao hay chưa. Nội dung đầy đủ để lên bảng xem trước do
 * {@link useSystemRubricTemplateVersionsQuery} lấy riêng khi người dùng thực sự mở một bản mẫu.
 */
export type SystemRubricTemplate = Rubric & {
  publishedVersions: { totalElements: number };
};

export type SystemRubricTemplatePage = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  content: SystemRubricTemplate[];
};

const SYSTEM_RUBRIC_TEMPLATES = `
  query SystemRubricTemplates($filter: SearchRubricFilter, $page: Int, $size: Int) {
    systemRubricTemplates(filter: $filter, page: $page, size: $size) {
      content {
        id
        code
        name
        description
        languageId
        frameworkId
        ownerType
        language {
          name
        }
        framework {
          name
        }
        publishedVersions: versions(status: "PUBLISHED", page: 1, size: 1) {
          totalElements
        }
      }
      page
      size
      totalElements
      totalPages
    }
  }
`;

async function fetchSystemRubricTemplates(
  filter: SearchRubricTemplateFilter,
  page: number,
  size: number
): Promise<SystemRubricTemplatePage> {
  const data = await graphQLRequest<{ systemRubricTemplates: SystemRubricTemplatePage }>(
    SYSTEM_RUBRIC_TEMPLATES,
    { filter, page, size }
  );

  const response = data.systemRubricTemplates;
  return response;
}

export function useSystemRubricTemplatesQuery(
  filter: SearchRubricTemplateFilter,
  page: number,
  size: number
) {
  return useQuery({
    queryKey: systemRubricTemplateKeys.list(filter, page, size),
    queryFn: () => fetchSystemRubricTemplates(filter, page, size),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5, // Danh mục mẫu của hệ thống rất ít đổi
  });
}

// ============================================================================
// XEM TRƯỚC NỘI DUNG MỘT BẢN MẪU
// ============================================================================

/**
 * Trần hiển thị của bảng xem trước, KHÔNG phải giới hạn của việc sao chép.
 *
 * Backend sao toàn bộ tiêu chí và thang điểm của phiên bản nguồn bất kể ta lấy bao nhiêu ở đây; hai
 * con số này chỉ giữ cho một lần gọi GraphQL khỏi phình ra khi có bản mẫu bất thường.
 */
const PREVIEW_CRITERIA_SIZE = 100;
const PREVIEW_RESULT_BAND_SIZE = 50;

/** Số phiên bản đã ban hành hiện trong ô chọn; nhiều hơn mức này là bất thường với một bản mẫu. */
const PREVIEW_VERSION_SIZE = 20;

export type TemplateCriterionPreview = Pick<
  RubricCriterion,
  'id' | 'code' | 'name' | 'description' | 'weight' | 'minScore' | 'maxScore' | 'order' | 'isRequired'
>;

export type TemplateResultBandPreview = Pick<
  RubricResultBand,
  'id' | 'code' | 'name' | 'description' | 'scoreMin' | 'scoreMax' | 'order'
>;

export type SystemRubricTemplateVersion = RubricVersion & {
  criteria: { totalElements: number; content: TemplateCriterionPreview[] };
  resultBands: { totalElements: number; content: TemplateResultBandPreview[] };
};

const SYSTEM_RUBRIC_TEMPLATE_VERSIONS = `
  query SystemRubricTemplateVersions($rubricId: ID!, $page: Int, $size: Int, $criteriaSize: Int, $bandSize: Int) {
    viewSystemRubricVersions(rubricId: $rubricId, status: "PUBLISHED", page: $page, size: $size) {
      content {
        id
        rubricId
        version
        code
        name
        description
        status
        effectiveFrom
        effectiveTo
        scoringScaleMin
        scoringScaleMax
        totalScoreMethod
        criteria(page: 1, size: $criteriaSize) {
          totalElements
          content {
            id
            code
            name
            description
            weight
            minScore
            maxScore
            order
            isRequired
          }
        }
        resultBands(page: 1, size: $bandSize) {
          totalElements
          content {
            id
            code
            name
            description
            scoreMin
            scoreMax
            order
          }
        }
      }
      totalElements
    }
  }
`;

/**
 * Các phiên bản ĐÃ BAN HÀNH của một bản mẫu, kèm tiêu chí và thang điểm để xem trước.
 *
 * Chỉ lấy bản PUBLISHED vì đó cũng là thứ duy nhất backend cho sao
 * ({@code CloneSystemRubricToSchoolUseCase} từ chối mọi phiên bản khác) — hiện bản nháp ra chỉ tạo
 * một lựa chọn chắc chắn thất bại.
 */
export function useSystemRubricTemplateVersionsQuery(
  rubricId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: systemRubricTemplateKeys.versions(rubricId || ''),
    queryFn: async () => {
      const data = await graphQLRequest<{
        viewSystemRubricVersions: { totalElements: number; content: SystemRubricTemplateVersion[] };
      }>(SYSTEM_RUBRIC_TEMPLATE_VERSIONS, {
        rubricId,
        page: 1,
        size: PREVIEW_VERSION_SIZE,
        criteriaSize: PREVIEW_CRITERIA_SIZE,
        bandSize: PREVIEW_RESULT_BAND_SIZE,
      });
      return data.viewSystemRubricVersions.content;
    },
    enabled: enabled && Boolean(rubricId),
    staleTime: 1000 * 60 * 5,
  });
}
