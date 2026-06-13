import axios from 'axios';

const JDOODLE_LANGUAGES = {
  python:     { lang: 'python3', versionIndex: '4' },
  javascript: { lang: 'nodejs',  versionIndex: '4' },
  java:       { lang: 'java',    versionIndex: '4' },
  cpp:        { lang: 'cpp17',   versionIndex: '1' },
  go:         { lang: 'go',      versionIndex: '4' },
  rust:       { lang: 'rust',    versionIndex: '4' },
  csharp:     { lang: 'csharp',  versionIndex: '4' },
  ruby:       { lang: 'ruby',    versionIndex: '4' },
};

export async function runCode({ code, language, stdin = '' }) {
  const jdoodleConfig = JDOODLE_LANGUAGES[language];
  if (!jdoodleConfig) {
    throw new Error('Unsupported language: ' + language);
  }

  const clientId = process.env.JDOODLE_CLIENT_ID;
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('JDoodle API credentials are not configured');
  }

  try {
    const response = await axios.post('https://api.jdoodle.com/v1/execute', {
      clientId,
      clientSecret,
      script: code,
      stdin,
      language: jdoodleConfig.lang,
      versionIndex: jdoodleConfig.versionIndex,
    });

    const output = response.data.output || '';
    
    // JDoodle doesn't strictly separate stdout/stderr, but handles compile errors natively
    // We treat execution as successful unless JDoodle explicitly throws a 400 error below
    return {
      stdout: output,
      stderr: '', // Output is combined in JDoodle
      exitCode: response.data.statusCode === 200 ? 0 : 1,
      status: 'success',
      time: response.data.cpuTime || null,
    };
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message || 'Execution failed';
    throw new Error(errorMsg);
  }
}

export function getSupportedLanguages() {
  return Object.keys(JDOODLE_LANGUAGES);
}
