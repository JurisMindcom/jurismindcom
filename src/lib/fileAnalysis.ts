// File analysis utilities with structured output

export interface FileAnalysis {
  file_id: string;
  filename: string;
  mime: string;
  size_bytes: number;
  language_detected: string[];
  ocr_text?: string;
  extracted_text?: string;
  entities?: Entity[];
  tables?: TableData[];
  pages?: PageData[];
  checks: string[];
  recommendations: string[];
  processing_trace: {
    engine_versions: Record<string, string>;
    timings_ms: Record<string, number>;
  };
  telemetry_id: string;
}

export interface Entity {
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'DATE' | 'MONEY' | 'LAW_SECTION';
  text: string;
  span: [number, number];
}

export interface TableData {
  id: string;
  rows: string[][];
  columns: string[];
  confidence: number;
}

export interface PageData {
  page: number;
  text: string;
  headings: string[];
  annotations: string[];
}

export const generateTelemetryId = (): string => {
  return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const detectLanguage = (text: string): string[] => {
  if (!text || text.length < 10) return ['unknown'];
  
  const banglaPat = /[\u0980-\u09FF]/;
  const englishPat = /[a-zA-Z]/;
  const arabicPat = /[\u0600-\u06FF]/;
  
  const languages: string[] = [];
  
  if (banglaPat.test(text)) languages.push('bn');
  if (englishPat.test(text)) languages.push('en');
  if (arabicPat.test(text)) languages.push('ar');
  
  return languages.length > 0 ? languages : ['unknown'];
};

export const extractEntities = (text: string): Entity[] => {
  const entities: Entity[] = [];
  
  // Extract law sections (e.g., "Section 420", "ধারা ৩০২")
  const sectionPatterns = [
    /Section\s+(\d+[A-Z]?)/gi,
    /ধারা\s+([\u09E6-\u09EF]+)/g,
    /Article\s+(\d+)/gi,
  ];
  
  sectionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        type: 'LAW_SECTION',
        text: match[0],
        span: [match.index, match.index + match[0].length],
      });
    }
  });

  // Extract dates
  const datePatterns = [
    /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/g,
    /\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/gi,
  ];
  
  datePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        type: 'DATE',
        text: match[0],
        span: [match.index, match.index + match[0].length],
      });
    }
  });

  // Extract money amounts (BDT, Taka)
  const moneyPatterns = [
    /BDT\s*[\d,]+(?:\.\d{2})?/gi,
    /Tk\.?\s*[\d,]+(?:\.\d{2})?/gi,
    /টাকা\s*([\u09E6-\u09EF,]+)/g,
  ];
  
  moneyPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      entities.push({
        type: 'MONEY',
        text: match[0],
        span: [match.index, match.index + match[0].length],
      });
    }
  });

  return entities;
};

export const analyzeFileContent = async (
  file: File,
  extractedText?: string
): Promise<FileAnalysis> => {
  const startTime = Date.now();
  const telemetryId = generateTelemetryId();
  
  let text = extractedText || '';
  const checks: string[] = [];
  const recommendations: string[] = [];
  
  // Extract text from file if not provided
  if (!text && file.type === 'text/plain') {
    text = await file.text();
    checks.push('text_extracted_directly');
  }
  
  // Detect languages
  const languages = detectLanguage(text);
  
  // Extract entities
  const entities = extractEntities(text);
  
  // Add checks based on file type
  if (file.type === 'application/pdf') {
    checks.push('pdf_detected');
    if (!text) {
      checks.push('ocr_may_be_required');
      recommendations.push('Upload a text-based PDF for better analysis');
    }
  }
  
  if (file.type.startsWith('image/')) {
    checks.push('image_detected');
    recommendations.push('OCR will be applied to extract text');
  }
  
  // Low content warning
  if (text.length < 100) {
    checks.push('low_content_warning');
    recommendations.push('Document has limited text content');
  }
  
  const analysis: FileAnalysis = {
    file_id: telemetryId,
    filename: file.name,
    mime: file.type || 'application/octet-stream',
    size_bytes: file.size,
    language_detected: languages,
    extracted_text: text,
    entities,
    checks,
    recommendations,
    processing_trace: {
      engine_versions: {
        analyzer: '1.0.0',
        entity_extractor: '1.0.0',
      },
      timings_ms: {
        total: Date.now() - startTime,
      },
    },
    telemetry_id: telemetryId,
  };
  
  return analysis;
};

export const formatAnalysisForChat = (analysis: FileAnalysis): string => {
  let formatted = `📄 **File Analysis**: ${analysis.filename}\n`;
  formatted += `- **Size**: ${(analysis.size_bytes / 1024).toFixed(2)} KB\n`;
  formatted += `- **Languages**: ${analysis.language_detected.join(', ')}\n`;
  
  if (analysis.entities && analysis.entities.length > 0) {
    formatted += `- **Detected**: ${analysis.entities.length} entities (laws, dates, amounts)\n`;
  }
  
  if (analysis.checks.length > 0) {
    formatted += `- **Checks**: ${analysis.checks.join(', ')}\n`;
  }
  
  if (analysis.extracted_text) {
    const preview = analysis.extracted_text.substring(0, 500);
    formatted += `\n**Content Preview**:\n${preview}${analysis.extracted_text.length > 500 ? '...' : ''}\n`;
  }
  
  return formatted;
};

export default analyzeFileContent;
