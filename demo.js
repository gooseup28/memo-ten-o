/*
 * MEMO-TEN-O 포트폴리오 데모 전용 데이터 계층
 * - 원본 앱의 Supabase 클라이언트와 같은 모양(createClient → auth / from() / rpc / functions.invoke)으로 동작하는 가짜 서버
 * - 모든 데이터는 방문자 브라우저의 localStorage에만 저장되고 외부로 전송되지 않음
 * - 같은 주소(github.io)의 다른 데모와 섞이지 않도록 저장소 이름은 모두 memoteno_ 로 시작
 * - AI 보조는 실제 AI를 부르지 않고 샘플 메모용으로 미리 써 둔 예시 결과만 보여 줌
 * - 사진 첨부는 인터넷에 올리지 않고, 작게 줄여서 메모 안에만 저장
 */
(function () {
    const PREFIX = 'memoteno_';
    const DB_KEY = 'memoteno_demo_db';
    const AUTH_KEY = 'memoteno_auth';             // app.html 의 storageKey 와 같아야 함
    const LOGGED_OUT_KEY = 'memoteno_logged_out'; // 방문자가 직접 로그아웃했는지
    const DEMO_USER = { id: 'demo-user', email: 'demo@example.com' };
    const DEMO_PASSWORD = '0000';

    /* ================= [DEMO: STORAGE] ================= */
    let memory = null; // localStorage를 쓸 수 없는 환경(사생활 보호 모드 등)용 대체 저장소

    function readDB() {
        if (memory) return memory;
        try {
            const raw = localStorage.getItem(DB_KEY);
            if (raw) return (memory = JSON.parse(raw));
        } catch (e) { /* 아래에서 새로 만듦 */ }
        memory = buildSeed();
        writeDB(memory);
        return memory;
    }

    function writeDB(db) {
        memory = db;
        try {
            localStorage.setItem(DB_KEY, JSON.stringify(db));
        } catch (e) {
            // 저장 공간이 꽉 차도 이번 화면에서는 계속 쓸 수 있게 메모리에만 둠
            setTimeout(() => window.alert('브라우저 저장 공간이 부족해서 이번 변경은 새로 고치면 사라져요. 데모 초기화로 비울 수 있어요.'), 0);
        }
    }

    function reset() {
        for (const store of [window.localStorage, window.sessionStorage]) {
            try {
                Object.keys(store).filter(k => k.startsWith(PREFIX)).forEach(k => store.removeItem(k));
            } catch (e) { /* 무시 */ }
        }
        memory = null;
        location.reload();
    }

    // 처음 열 때는 데모 계정으로 로그인된 상태 (직접 로그아웃했으면 로그인 화면부터)
    try {
        if (localStorage.getItem(LOGGED_OUT_KEY) !== '1' && !sessionStorage.getItem(AUTH_KEY) && !localStorage.getItem(AUTH_KEY)) {
            sessionStorage.setItem(AUTH_KEY, JSON.stringify(makeSession()));
        }
    } catch (e) { /* 저장소를 못 쓰면 로그인 화면부터 */ }

    function makeSession() {
        return { access_token: 'demo.access.token', refresh_token: 'demo', user: { ...DEMO_USER } };
    }

    /* ================= [DEMO: SAMPLE DATA] ================= */
    const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

    // 손그림(마크업) 예시: 캔버스에 간단한 화면 스케치를 그려서 PNG로
    function sketchImage() {
        try {
            const c = document.createElement('canvas');
            c.width = 480; c.height = 300;
            const g = c.getContext('2d');
            g.fillStyle = '#ffffff'; g.fillRect(0, 0, 480, 300);
            g.lineCap = 'round'; g.lineJoin = 'round';
            g.strokeStyle = '#1c1c1e'; g.lineWidth = 3;
            const box = (x, y, w, h) => { g.beginPath(); g.roundRect(x, y, w, h, 14); g.stroke(); };
            box(20, 20, 140, 260);              // 목록
            box(176, 20, 284, 260);             // 편집 화면
            g.lineWidth = 2;
            for (let i = 0; i < 4; i++) box(34, 60 + i * 48, 112, 36);
            g.beginPath(); g.moveTo(196, 60); g.lineTo(380, 60); g.stroke();
            for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(196, 100 + i * 26); g.lineTo(196 + 230 - i * 30, 100 + i * 26); g.stroke(); }
            g.strokeStyle = '#ff3b30'; g.lineWidth = 3;
            g.beginPath(); g.ellipse(318, 250, 70, 18, 0, 0, Math.PI * 2); g.stroke();
            g.fillStyle = '#ff3b30'; g.font = 'bold 15px sans-serif'; g.fillText('툴바는 아래에 떠 있게', 256, 228);
            return c.toDataURL('image/png');
        } catch (e) {
            return '';
        }
    }

    function buildSeed() {
        const now = Date.now();
        const sketch = sketchImage();
        const folders = [
            { id: 'folder-dev', name: '개발 아이디어', created_at: now - 60 * DAY },
            { id: 'folder-study', name: '공부 기록', created_at: now - 50 * DAY },
            { id: 'folder-life', name: '생활', created_at: now - 40 * DAY },
        ];
        const memo = (id, title, body, opts = {}) => ({
            id, title, body,
            is_pinned: !!opts.pinned,
            folder_id: opts.folder || null,
            created_at: now - (opts.created || 2 * DAY),
            updated_at: now - (opts.updated || HOUR),
        });
        const memos = [
            memo('memo-guide', 'MEMO-TEN-O 둘러보기',
                '<div>시연용 메모예요. 아래를 하나씩 눌러 보세요.</div>'
                + '<ul><li class="checked">메모를 왼쪽으로 밀면 이동·삭제, 오른쪽으로 밀면 고정</li>'
                + '<li>위쪽 \'모든 메모\'를 눌러 폴더 바꾸기</li>'
                + '<li>아래 검색창에 \'체크\' 입력해 보기</li>'
                + '<li>메모를 열고 아래 ✨ 버튼으로 AI 보조(시연용 예시) 보기</li>'
                + '<li>동그라미를 눌러 체크리스트 완료 표시</li></ul>'
                + '<div>원본은 내 계정으로 로그인해야 열리고, 데모는 이 브라우저에만 저장돼요.</div>',
                { pinned: true, created: 30 * MIN, updated: 10 * MIN }),
            memo('memo-week', '이번 주 할 일',
                '<ul><li class="checked">빨래 맡기기</li><li class="checked">사지방 예약 시간 확인</li><li>개발 메모 정리하기</li><li>운동 3번</li><li>책 50쪽 읽기</li></ul>',
                { pinned: true, created: 3 * DAY, updated: 2 * HOUR }),
            memo('memo-dev', '사지방에서 이어 할 개발 메모',
                '<div>오늘 한 것</div><ul><li class="checked">목록과 편집 화면을 나란히 보이게 바꿈</li><li class="checked">검색이 제목과 본문을 같이 찾게 함</li></ul>'
                + '<div>다음에 할 것</div><ul><li>정렬 메뉴에 가나다순 추가</li><li>폴더 이름 바꾸기</li><li>휴대폰에서 밀어서 지우기 다듬기</li></ul>'
                + '<div>PC가 매일 초기화되니까, 끝나기 전에 꼭 여기에 적어 두기.</div>',
                { folder: 'folder-dev', created: 6 * DAY, updated: 5 * HOUR }),
            memo('memo-deploy', '배포 전 체크리스트',
                '<ul><li class="checked">휴대폰 화면에서 버튼 겹침 확인</li><li>다크 모드 글자색 확인</li><li>API 키는 코드에 넣지 않기</li></ul>'
                + '<div>환경 변수 예시</div><div>GEMINI_API_KEY = [시연용 값]</div><div>IMGBB_API_KEY = [시연용 값]</div>',
                { folder: 'folder-dev', created: 8 * DAY, updated: 1 * DAY }),
            memo('memo-sketch', '화면 스케치',
                '<div>메모 화면 구조를 손으로 그려 봤어요. 아래 툴바의 마크업(A) 버튼으로 직접 그릴 수 있어요.</div>'
                + (sketch ? `<img src="${sketch}" alt="화면 스케치">` : ''),
                { folder: 'folder-dev', created: 9 * DAY, updated: 2 * DAY }),
            memo('memo-js', 'JavaScript 배열 메서드 정리',
                '<div>map: 모든 값을 바꿔서 새 배열</div><div>filter: 조건에 맞는 값만 남김</div><div>reduce: 값을 하나로 모음 (합계 등)</div>'
                + '<div>find: 조건에 맞는 첫 값</div><div>some / every: 하나라도 / 모두 맞는지</div><div>헷갈리면 콘솔에서 직접 해 보기!</div>',
                { folder: 'folder-study', created: 12 * DAY, updated: 3 * DAY }),
            memo('memo-books', '읽고 싶은 책',
                '<ul><li class="checked">사용자 경험 디자인 입문서</li><li>자바스크립트 기초 다시 보기</li><li>글쓰기 연습 책</li><li>데이터베이스 첫걸음</li></ul>',
                { folder: 'folder-study', created: 20 * DAY, updated: 4 * DAY }),
            memo('memo-meeting', '회의 준비: 동아리 발표',
                '<div>발표 주제: 공용 PC에서도 끊기지 않는 메모 앱</div><div>1. 불편했던 점 (매일 초기화되는 PC)</div><div>2. 해결 방법 (브라우저만 있으면 되는 메모장)</div>'
                + '<div>3. 시연 (검색, 고정, 폴더, 체크리스트)</div><div>4. 배운 점과 다음 계획</div><div>준비물: 노트북, 발표 자료, 시연용 계정</div>',
                { folder: 'folder-life', created: 5 * DAY, updated: 6 * DAY }),
            memo('memo-workout', '주말 운동 루틴',
                '<ul><li>스트레칭 10분</li><li>팔굽혀펴기 3세트</li><li>윗몸 일으키기 3세트</li><li>달리기 3km</li></ul><div>무리하지 말고 기록만 꾸준히.</div>',
                { folder: 'folder-life', created: 15 * DAY, updated: 9 * DAY }),
        ];
        return {
            mto_memos: Object.fromEntries(memos.map(m => [m.id, m])),
            mto_folders: Object.fromEntries(folders.map(f => [f.id, f])),
        };
    }

    /* ================= [DEMO: AI EXAMPLES] ================= */
    // 실제 AI(Gemini)를 부르지 않음. 샘플 메모에만 미리 써 둔 예시 결과를 보여 줌
    const AI_LABEL = '[시연용 예시 결과 · 실제 AI가 만든 글이 아니에요]\n\n';
    const AI_EXAMPLES = [
        {
            match: '발표 주제',
            summarize: '- 공용 PC에서도 끊기지 않는 메모 앱을 소개하는 발표\n- 불편했던 점 → 해결 방법 → 시연 → 배운 점 순서\n- 준비물: 노트북, 발표 자료, 시연용 계정',
            grammar: '발표 주제는 "공용 PC에서도 끊기지 않는 메모 앱"입니다. 먼저 매일 초기화되는 PC에서 겪은 불편을 말하고, 브라우저만 있으면 되는 메모장이라는 해결 방법을 소개합니다. 이어서 검색·고정·폴더·체크리스트를 시연하고, 배운 점과 다음 계획으로 마무리합니다.',
            tone: '격식 있는 버전\n본 발표에서는 공용 PC 환경에서도 기록이 끊기지 않는 메모 애플리케이션을 소개하겠습니다.\n\n부드러운 버전\n오늘은 매일 초기화되는 PC에서도 메모를 잃지 않게 만든 앱을 소개해 볼게요!',
            expand: '- 시연 전에 샘플 메모를 미리 준비해 두기\n- 질문이 나올 만한 부분: 데이터는 어디에 저장되는지, 로그인은 어떻게 하는지\n- 발표 끝에 실제로 써 볼 수 있는 데모 주소 보여 주기\n- 다음 계획: 메모별 잠금, 첨부파일 정리',
        },
        {
            match: '다음에 할 것',
            summarize: '- 목록·편집 화면 나란히 보기와 통합 검색을 완료\n- 다음 할 일: 가나다순 정렬, 폴더 이름 바꾸기, 밀어서 지우기 개선\n- PC 초기화 전에 메모로 진행 상황 남기기',
            grammar: '오늘은 목록과 편집 화면을 나란히 보이게 바꾸고, 검색이 제목과 본문을 함께 찾도록 했다. 다음에는 정렬 메뉴에 가나다순을 추가하고, 폴더 이름 바꾸기와 휴대폰에서 밀어서 지우기를 다듬을 예정이다.',
            tone: '격식 있는 버전\n금일 목록·편집 화면 병렬 배치와 통합 검색 기능을 완료하였습니다.\n\n부드러운 버전\n오늘은 화면 배치랑 검색을 끝냈어요. 다음엔 정렬이랑 폴더 이름 바꾸기 차례!',
            expand: '- 정렬 기준을 저장해서 다음 접속 때도 유지하기\n- 폴더별 메모 개수 보여 주기\n- 자주 쓰는 메모를 맨 위에 고정하는 단축키\n- 작업 기록용 템플릿 메모 만들기',
        },
        {
            match: '환경 변수 예시',
            summarize: '- 휴대폰 화면 확인은 완료\n- 다크 모드 글자색 확인이 남음\n- API 키는 코드가 아니라 환경 변수에 두기',
            grammar: '배포 전에 휴대폰 화면에서 버튼이 겹치지 않는지 확인했다. 다크 모드의 글자색을 확인해야 하며, API 키는 코드에 넣지 않고 환경 변수로 관리한다.',
            tone: '격식 있는 버전\n배포 전 점검 항목: 모바일 레이아웃(완료), 다크 모드 가독성, API 키의 환경 변수 관리.\n\n부드러운 버전\n휴대폰 화면은 확인했고, 다크 모드만 보면 돼요. 키는 꼭 코드 밖에!',
            expand: '- 배포 후 로그인 없이 데이터가 보이지 않는지 시크릿 창으로 확인\n- 외부 라이브러리는 버전을 고정하기\n- 백업(내보내기) 기능이 되는지 확인\n- 오류가 나면 사용자에게 이유를 보여 주기',
        },
        {
            match: 'filter: 조건에 맞는 값만',
            summarize: '- map·filter·reduce로 배열을 바꾸고, 거르고, 모음\n- find는 첫 값, some·every는 조건 확인\n- 헷갈리면 콘솔에서 직접 실행',
            grammar: 'map은 모든 값을 바꿔 새 배열을 만들고, filter는 조건에 맞는 값만 남긴다. reduce는 값을 하나로 모으며(합계 등), find는 조건에 맞는 첫 값을 찾는다. some과 every는 하나라도 또는 모두 조건에 맞는지 확인한다.',
            tone: '격식 있는 버전\n배열 메서드 요약: map(변환), filter(선별), reduce(집계), find(탐색), some·every(조건 검사).\n\n부드러운 버전\nmap은 바꾸기, filter는 거르기, reduce는 모으기! 헷갈리면 콘솔에서 해 보면 돼요.',
            expand: '- 예제: [1, 2, 3].map(x => x * 2) → [2, 4, 6]\n- filter와 map을 이어서 쓰기\n- reduce로 메모 글자 수 합계 구해 보기\n- includes, sort도 같이 정리하기',
        },
    ];
    const AI_FALLBACK = '시연판에서는 실제 AI(Gemini)를 부르지 않아요.\n\n샘플 메모(회의 준비: 동아리 발표, 사지방에서 이어 할 개발 메모, 배포 전 체크리스트, JavaScript 배열 메서드 정리)에서 AI 버튼을 누르면 미리 써 둔 예시 결과를 볼 수 있어요.\n\n원본 앱은 메모 주인 계정만 쓸 수 있는 서버 함수를 거쳐 Gemini가 결과를 만들어요.';

    function aiResult(text, type) {
        const example = AI_EXAMPLES.find(e => String(text).includes(e.match));
        return example && example[type] ? AI_LABEL + example[type] : AI_FALLBACK;
    }

    /* ================= [DEMO: PHOTO] ================= */
    // 고른 사진을 긴 쪽 1000px 이하로 줄여서 메모 안에 저장 (인터넷에 올리지 않음)
    function shrinkImage(base64) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
                const c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(img.width * scale));
                c.height = Math.max(1, Math.round(img.height * scale));
                const g = c.getContext('2d');
                g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
                g.drawImage(img, 0, 0, c.width, c.height);
                resolve(c.toDataURL('image/jpeg', 0.82));
            };
            img.onerror = () => reject(new Error('사진 파일만 올릴 수 있어요.'));
            const head = String(base64 || '').slice(0, 16);
            const type = head.startsWith('/9j/') ? 'jpeg' : head.startsWith('R0lG') ? 'gif' : head.startsWith('UklG') ? 'webp' : 'png';
            img.src = `data:image/${type};base64,${base64}`;
        });
    }

    /* ================= [DEMO: CLIENT] ================= */
    const DEFAULTS = {
        mto_memos: () => ({ title: '', body: '', is_pinned: false, folder_id: null, created_at: Date.now(), updated_at: Date.now() }),
        mto_folders: () => ({ created_at: Date.now() }),
    };
    const clone = v => JSON.parse(JSON.stringify(v));
    const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

    function createClient(_url, _key, options = {}) {
        const authOptions = options.auth || {};
        const storage = authOptions.storage || window.sessionStorage;
        const storageKey = authOptions.storageKey || AUTH_KEY;
        const authListeners = new Set();

        const currentSession = () => { try { return JSON.parse(storage.getItem(storageKey)); } catch (e) { return null; } };
        const signedIn = () => currentSession()?.user?.id === DEMO_USER.id;
        const emit = (event, session) => authListeners.forEach(cb => cb(event, session));

        const auth = {
            async signInWithPassword({ email, password }) {
                if (String(email).trim().toLowerCase() !== DEMO_USER.email || password !== DEMO_PASSWORD) {
                    return { data: { session: null, user: null }, error: { code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' } };
                }
                const session = makeSession();
                storage.setItem(storageKey, JSON.stringify(session));
                try { localStorage.removeItem(LOGGED_OUT_KEY); } catch (e) { /* 무시 */ }
                emit('SIGNED_IN', session);
                return { data: { session, user: session.user }, error: null };
            },
            async signOut() {
                storage.removeItem(storageKey);
                try { localStorage.setItem(LOGGED_OUT_KEY, '1'); } catch (e) { /* 무시 */ }
                emit('SIGNED_OUT', null);
                return { error: null };
            },
            async getSession() { return { data: { session: currentSession() }, error: null }; },
            onAuthStateChange(cb) {
                authListeners.add(cb);
                Promise.resolve().then(() => cb('INITIAL_SESSION', currentSession()));
                return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
            },
        };

        // 원본의 보안 규칙처럼: 로그인하지 않으면 읽기는 빈 결과, 쓰기는 거절
        function from(table) {
            const state = { op: 'select', filters: [], single: false, values: null, options: {} };
            const builder = {
                select() { return builder; },
                insert(values) { state.op = 'insert'; state.values = values; return builder; },
                upsert(values, opts = {}) { state.op = 'upsert'; state.values = values; state.options = opts; return builder; },
                update(values) { state.op = 'update'; state.values = values; return builder; },
                delete() { state.op = 'delete'; return builder; },
                eq(column, value) { state.filters.push([column, value]); return builder; },
                order() { return builder; },
                range() { return builder; },
                single() { state.single = true; return builder; },
                then(resolve, reject) { return run().then(resolve, reject); },
            };
            const matches = row => state.filters.every(([c, v]) => row[c] === v);

            async function run() {
                const db = readDB();
                const rows = db[table];
                if (!rows) return { data: null, error: { message: `unknown table ${table}` } };
                const ok = signedIn();
                if (state.op === 'select') {
                    return { data: ok ? clone(Object.values(rows).filter(matches)) : [], error: null };
                }
                if (!ok) return { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } };
                if (state.op === 'insert' || state.op === 'upsert') {
                    const list = Array.isArray(state.values) ? state.values : [state.values];
                    const out = [];
                    for (const v of list) {
                        const id = v.id || newId();
                        if (rows[id] && (state.op === 'insert' || state.options.ignoreDuplicates)) continue;
                        rows[id] = { ...DEFAULTS[table](), ...v, id };
                        out.push(rows[id]);
                    }
                    writeDB(db);
                    return { data: clone(state.single ? out[0] ?? null : out), error: null };
                }
                if (state.op === 'update') {
                    const out = [];
                    for (const r of Object.values(rows)) if (matches(r)) { Object.assign(r, state.values); out.push(r); }
                    if (out.length) writeDB(db);
                    return { data: clone(out), error: null };
                }
                if (state.op === 'delete') {
                    let removed = 0;
                    for (const r of Object.values(rows)) if (matches(r)) { delete rows[r.id]; removed++; }
                    if (removed) writeDB(db);
                    return { data: null, error: null };
                }
                return { data: null, error: { message: 'unsupported' } };
            }
            return builder;
        }

        const fail = message => ({ data: null, error: { message, context: new Response(JSON.stringify({ error: message }), { status: 400 }) } });

        return {
            auth,
            from,
            async rpc(name) {
                if (name !== 'mto_is_owner') return { data: null, error: { message: 'unknown rpc' } };
                return { data: signedIn(), error: null };
            },
            // 실시간 반영: 데모는 한 화면에서만 쓰므로 알림 없음
            channel() { const ch = { on() { return ch; }, subscribe() { return ch; } }; return ch; },
            removeChannel() { return Promise.resolve('ok'); },
            functions: {
                async invoke(name, { body } = {}) {
                    if (!signedIn()) return fail('로그인이 필요합니다.');
                    if (name === 'memo-ai') {
                        await new Promise(r => setTimeout(r, 700)); // 생각하는 듯한 짧은 기다림
                        return { data: { result: aiResult(body && body.text, body && body.type) }, error: null };
                    }
                    if (name === 'memo-upload') {
                        try { return { data: { url: await shrinkImage(body && body.image) }, error: null }; }
                        catch (e) { return fail(e.message); }
                    }
                    return fail('데모에 없는 기능이에요.');
                },
            },
        };
    }

    window.supabase = { createClient };
    window.DemoDB = { reset, DEMO_EMAIL: DEMO_USER.email, DEMO_PASSWORD };
})();
