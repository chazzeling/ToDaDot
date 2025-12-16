import { defineConfig, loadEnv } from 'vite';
import { resolve, isAbsolute } from 'path';

export default defineConfig(({ mode }) => {
  const isPreload = process.env.BUILD_TARGET === 'preload';
  
  // 현재 모드의 환경 변수 로드 (.env 파일에서)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    build: {
      outDir: 'dist-electron',
      emptyOutDir: false, // 이전 빌드 파일을 유지
      lib: {
        entry: isPreload 
          ? resolve(__dirname, 'preload.ts')
          : resolve(__dirname, 'main.ts'),
        formats: ['cjs'], // main과 preload 모두 CommonJS로 빌드
        fileName: () => isPreload ? 'preload.cjs' : 'main.cjs',
      },
      rollupOptions: {
        external: (id) => {
          // Node.js 내장 모듈
          if (id.startsWith('node:')) return true;
          // npm 패키지들 (번들링하지 않음)
          if (id === 'electron') return true;
          const npmPackages = ['better-sqlite3', 'dotenv', 'googleapis', 'google-auth-library'];
          if (npmPackages.includes(id)) return true;
          // tsx는 번들링에 포함 (개발 모드에서 필요)
          if (id === 'tsx' || id.startsWith('tsx/')) return false;
          // 상대 경로나 절대 경로로 시작하지 않는 것들은 npm 패키지로 간주
          if (!id.startsWith('.') && !id.startsWith('/') && !isAbsolute(id)) {
            return true;
          }
          // 로컬 파일(./database.js, ./googleApi.js 등)은 번들링에 포함 (false 반환)
          return false;
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, '../src'),
      },
    },
    // 환경 변수를 빌드 시점에 코드에 주입
    define: {
      // Vite가 빌드 시점에 이 값을 코드에 직접 주입합니다
      // 런타임에 .env 파일을 읽을 필요가 없어집니다
      // 
      // 주의: Vite의 define은 코드에서 정확히 일치하는 문자열을 찾아서 치환합니다.
      // process.env.VITE_GOOGLE_CLIENT_SECRET → "actual-secret-value" (문자열 리터럴)
      'process.env.VITE_GOOGLE_CLIENT_SECRET': JSON.stringify(env.GOOGLE_CLIENT_SECRET || ''),
      // 추가로 GOOGLE_CLIENT_SECRET도 주입 (fallback용)
      'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(env.GOOGLE_CLIENT_SECRET || ''),
    },
  };
});
