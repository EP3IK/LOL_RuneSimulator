const once = {once: true};

const loadImage = url => {
    return new Promise((resolve, reject) => {
        let img = new Image();
        img.addEventListener('load', e => resolve(img));
        img.addEventListener('error', () => {
            reject(new Error(`Failed to load image's URL: ${url}`));
        });
        img.src = url;
    });
};

CanvasRenderingContext2D.prototype.fillTextNewLine = function(text, x, y, maxWidth) {
    let len = 0;
    let str = '';
    let arr = Array.from(text).reduce((a, v, i) => {
        let now = 1 + (escape(v.charAt(0)).length === 6);
        if (len + now <= maxWidth) {
            len += now;
            str += v;
        } else {
            a.push(str);
            len = now;
            str = v;
        }
        if (i + 1 === text.length) {
            a.push(str);
        }
        return a;
    }, []);
    arr.forEach((str, i) => {
        this.fillText(str.trim(), x, y + 16 * i);
    });
};

const LOL_RuneSimulator = lang => {
    return new Promise((resolve, reject) => {
        let imgJSON = 'https://raw.githubusercontent.com/EP3IK/lol_rune/master/img.json';
        let listJSON = 'https://raw.githubusercontent.com/EP3IK/lol_rune/master/languages/' + lang + '.json';
        let font = [
            {
            //     family: "BBTreeGR",
            //     url: "url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_nine_@1.1/BBTreeGR.woff')"
            // }, {
            //     family: "BBTreeGB",
            //     url: "url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_nine_@1.1/BBTreeGB.woff')"
            // }, {
                family: "GoyangIlsan",
                url: "url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_one@1.0/GoyangIlsan.woff')"
            }
        ];

        let keys = {};
        
        Promise.all(font.map(f => new FontFace(f.family, f.url).load()))
        .then(loadedFaces => {
            loadedFaces.forEach(loadedFace => document.fonts.add(loadedFace));
        })
        .then(_ => fetch(imgJSON).then(rsp => rsp.json()))
        .then(img => {
            keys = Object.keys(img);
            let res = [
                Object.values(img).map(url => loadImage(url)),
                fetch(listJSON).then(rsp => rsp.json()),
            ].flat();
            return Promise.all(res);
        })
        .then(list => {
            let images = list.splice(0, keys.length).reduce((a, v, i) => {
                a[keys[i]] = v;
                return a;
            }, {});

            let c = document.createElement('canvas');
            c.width = 1056;
            c.height = 640;
            c.style.border = '1px solid #000000';
            let data = new runeData(c, list[0], images);
            data.reset();
            resolve(data);
        })
        .catch(err => reject(err));
    });
};


// http://ddragon.canisback.com/latest/data/ko_KR/runesReforged.json
class runeData {
    constructor(canvas, list, images) {
        this.data = {};
        this.button = Array(21);
        this.mode = 0;
        this.canvas = canvas;
        this.list = list;
        this.images = images;
        this.mousePos = {
            x: 0,
            y: 0
        };
        this.mouseOn = '';
        this.finished = false;
    }
    reset() {
        // data
        this.data = {
            path: {
                numbers: [0, 0, 6],
                active: [false, false, false]
            },
            primary: {
                numbers: [0, 0, 0, 0],
                active: [false, false, false, false]
            },
            secondary: {
                // 마법의 신발 + 시간 왜곡 물약: [2, 23]
                numbers: [0, 0],
                active: [false, false]
            },
            bonus: {
                numbers: [0, 0, 0],
                active: [false, false, false]
            }
        };

        // canvas mouse event
        // 전부 비워버리고 5분할 화면
        let c = this.canvas;

        const trackMousePos = event => {
            let rect = c.getBoundingClientRect();
            this.mousePos = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
            // console.log(this.mousePos);
        };
        const move = () => {
            let x = this.mousePos.x;
            let piece = c.width / 5;
            this.mouseOn = 'start' + [1, 1, 2, 3, 4, 5, 5][Math.ceil(x / piece)];
            this.drawStartPage();
        }
        const leave = () => {
            this.mouseOn = '';
            this.drawStartPage();
        }
        const click = () => {
            c.removeEventListener('mousemove', move);
            c.removeEventListener('mouseleave', leave);
            c.removeEventListener('click', click);
            this.data.path.numbers[0] = this.mouseOn[5] >> 0;
            if (this.mode === 1) {
                // 모드1: 첫 에임은 보조 빌드
                this.data.path.active[1] = true;
            } else {
                // 모드0: 첫 에임은 핵심 룬
                this.data.primary.active[0] = true;
            }
            this.button.fill(1, 0, 11);
            this.button.fill(0, 11);
            this.set();
            // 누르면 반응하도록 버튼 생성
            this.makeButton();
        };
        c.removeEventListener('mousemove', trackMousePos);
        c.addEventListener('mousemove', trackMousePos);
        c.addEventListener('mousemove', move);
        c.addEventListener('mouseleave', leave);
        c.addEventListener('click', click);

        console.log(this.mouseOn);
        this.drawStartPage();
    }
    drawStartPage() {
        let c = this.canvas;
        let ctx = c.getContext('2d');
        let color = [, '#C9BA8E', '#CF4141', '#9CA7F6', '#9ED084', '#48A7B5'];

        ctx.fillStyle = '#010A13';
        ctx.fillRect(0, 0, c.width, c.height);
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        let piece = c.width / 5;
        for (let i = 1; i <= 5; ++i) {
            let testX = (i - .5) * piece;

            let img = this.images['ring'];
            ctx.drawImage(img, testX - 105.5, 30, 211, 246);
            if (this.mouseOn === 'start' + i) {
                ctx.filter = 'none';
                img = this.images['lines'];
                ctx.drawImage(img, testX - 105.5, 0, 211, 641);
                img = this.images['glow' + i];
                ctx.drawImage(img, testX - 105.5, 0, 211, 641);
                img = this.images['vfx' + i];
                ctx.drawImage(img, testX - 105.5, 30, 211, 246);
            } else {
                ctx.filter = 'grayscale(1)';
            }
            img = this.images[i];
            ctx.drawImage(img, testX - 105.5, 30, 211, 246);

            let has4 = this.list.build[i].keystone[4];
            let y = [332, 425, 332, 425];
            if (has4) {
                [-95.5, -95.5, 5.5, 5.5].forEach((v, i2) => {
                    img = this.images[100 * i + i2 + 1];
                    ctx.drawImage(img, testX + v, y[i2], 90, 90);
                })
            } else {
                [-95.5, -45, 5.5].forEach((v, i2) => {
                    img = this.images[100 * i + i2 + 1];
                    ctx.drawImage(img, testX + v, y[i2], 90, 90);
                })
            }

            ctx.fillStyle = color[i];
            ctx.font = 'bold 15px GoyangIlsan';
            ctx.fillText(this.list.build[i].name, testX, 231);
            ctx.fillStyle = this.mouseOn === 'start' + i ? 'white' : 'grey';
            ctx.font = 'bold 11px GoyangIlsan';
            ctx.fillText(this.list.build[i].caption, testX, 253);
            ctx.font = '12px GoyangIlsan';
            ctx.fillText(this.list.build[i].description, testX, 541);

            ctx.filter = 'none';
        }
    }
    set() {
        // 캔버스 그리는 순서
        
        // 빌드1 배경
        this.clearCanvas();
        this.drawBackground();
        // 빌드1 수직선
        this.drawVertical();
        // 빌드1 핵심룬선
        this.drawKeystoneLine();
        // 빌드1 4원
        this.drawBuildCircle();

        // 모드에 따라서 라인 위에 원
        this.drawLineCircle();
        // 설명 또는 룬 그림
        this.drawRuneCircle();
        // 오른쪽 배경 그림
        this.drawConstruct();
        // 모드 변경 버튼
        this.drawModeChanger();
    }
    drawConstruct() {
        let c = this.canvas;
        let ctx = c.getContext('2d');
        if (this.finished) {
            let primaryNum = this.data.path.numbers[0];
            let secondaryNum = this.data.path.numbers[1];
            let keystoneNum = this.data.primary.numbers[0];
            let img = this.images['b' + (10 * primaryNum + secondaryNum)];
            ctx.drawImage(img, 462, c.height - 720);
            img = this.images['c' + 10 * primaryNum];
            ctx.drawImage(img, 462, c.height - 720);
            img = this.images['c' + (10 * primaryNum + keystoneNum)];
            ctx.drawImage(img, 512, -55);
        }
    }
    drawModeChanger() {
        let c = this.canvas;
        let ctx = c.getContext('2d');

        ctx.fillStyle = '#ADA598';
        const dot3 = (x, y) => { for (const h of [0, 5, 10]) ctx.fillRect(x, y + h, 3, 2); };
        for (const x of [42, 47, 50, 53, 67, 72, 77]) dot3(x, c.height - 50);
        
        ctx.strokeStyle = '#433F34';
        ctx.lineWidth = 1;
        if (this.mode === 0) ctx.strokeRect(36.5, c.height + 584.5 - 640, 25, 23);
        else ctx.strokeRect(61.5, c.height + 584.5 - 640, 24, 23);
    }
    clearCanvas() {
        let c = this.canvas;
        c.getContext('2d').clearRect(0, 0, c.width, c.height);
    }
    drawBackground() {
        let c = this.canvas;
        let ctx = c.getContext('2d');
        let img = this.images['env' + this.data.path.numbers[0]];
        ctx.drawImage(img, 0, 80, 1056, 640, 0, 0, c.width, c.height);
    }
    drawVertical() {
        let c = this.canvas;
        let ctx = c.getContext('2d');
        
        let px = c.height / 640;
        // ctx.line_vertical(60, 174, 350, first);
        // ctx.line_vertical(385, 174, 175, second);
        // ctx.line_vertical(385, 440, 85, 0);
        let x = [60, 385, 385];
        let y = [174, 174, 440];
        let len = [350, 175, 85];
        let color = [
            // 미선택, 정밀, 지배, 마법, 결의, 영감, 보너스
            ['#A9A487', '#4c4a40'],
            ['#C9BA8E', '#575243'],
            ['#CF4141', '#592828'],
            ['#9CA7F6', '#484b67'],
            ['#9ED084', '#485a3f'],
            ['#48A7B5', '#2a4b50'],
            ['#CEBD80', '#59533e']
        ];

        ctx.filter = 'opacity(.4)';
        this.data.path.numbers.forEach((n, i) => {
            ctx.strokeStyle = color[n][0];
            ctx.lineWidth = 4 * px;
            ctx.beginPath();
            ctx.moveTo(x[i] * px, y[i] * px);
            ctx.lineTo(x[i] * px, y[i] * px + len[i] * px);
            ctx.stroke();

            ctx.strokeStyle = color[n][1];
            ctx.lineWidth = 2 * px;
            ctx.beginPath();
            for (const p of [-5, 5]) {
                ctx.moveTo((x[i] + p) * px, y[i] * px);
                ctx.lineTo((x[i] + p) * px, y[i] * px + len[i] * px);
            }
            ctx.stroke();
        });
        ctx.filter = 'none';
    }
    drawKeystoneLine() {
        let c = this.canvas;
        let ctx = c.getContext('2d');
        let px = c.height / 640;
        let primaryNum = this.data.path.numbers[0];
        let color = [, '#C8AA6E', '#DC4747', '#6C75F4', '#A4D08D', '#48B4BE'];
        ctx.beginPath();
        let lingrad = ctx.createLinearGradient(21 * px, 0, 306 * px, 0);
        lingrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        lingrad.addColorStop(0.5, color[primaryNum]);
        lingrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.strokeStyle = lingrad;
        ctx.lineWidth = 1 * px;
        ctx.moveTo(37 * px, 198.5 * px);
        ctx.lineTo(41 * px, 194.5 * px);
        ctx.lineTo(75.5 * px, 194.5 * px);
        ctx.lineTo(83.5 * px, 202.5 * px);
        ctx.lineTo(306 * px, 202.5 * px);

        ctx.moveTo(21 * px, 198.5 * px);
        ctx.lineTo(214 * px, 198.5 * px);
        ctx.lineTo(218 * px, 202.5 * px);

        ctx.moveTo(37 * px, 306.5 * px);
        ctx.lineTo(41 * px, 310.5 * px);
        ctx.lineTo(75.5 * px, 310.5 * px);
        ctx.lineTo(83.5 * px, 302.5 * px);
        ctx.lineTo(306 * px, 302.5 * px);

        ctx.moveTo(21 * px, 306.5 * px);
        ctx.lineTo(214 * px, 306.5 * px);
        ctx.lineTo(218 * px, 302.5 * px);
        ctx.stroke();
        
        ctx.fillStyle = color[primaryNum];
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 11px GoyangIlsan';
        ctx.fillText(this.list.build[primaryNum].keystone.name, 113, 180);
    }
    drawBuildCircle() {
        let c = this.canvas;
        let ctx = c.getContext('2d');
        
        let px = c.height / 640;

        let x = [60, 385];
        let colors = [
            // 순서대로 미선택, 정밀, 지배, 마법, 결의, 영감
            ['#A9A487', 'PALEGOLDENROD'],
            ['#C9BA8E', 'gold'],
            ['#CF4141', 'crimson'],
            ['#9CA7F6', 'royalblue'],
            ['#9ED084', 'yellowgreen'],
            ['#48A7B5', 'DARKTURQUOISE'],
        ];
        let mouseOn = +(this.mouseOn === 'buildCircle');

        let tri = [
            [-28, 0, 24],
            [143, 105, 149],
            [4, 0, -8],
            [126, 143, 131],
            [-3.5, 3.5, 0],
            [-1, -1, 5]
        ];
        x.forEach((v, i) => {
            let centerX = v * px;
            let centerY = 133 * px;
            let color = colors[this.data.path.numbers[i]];
            let transparent = Array.from(color[0]).reduce((a, v, i) => {
                if (i === 0) return a;
                else {
                    if (i % 2 === 1) {
                        a.tmp += 16 * parseInt(v, 16);
                        return a;
                    } else {
                        a.tmp += parseInt(v, 16);
                        a.str += a.tmp + ',';
                        a.tmp = 0;
                        if (i === 6) return a.str + '0)';
                        else return a;
                    }
                }
            }, {str: 'rgba(', tmp: 0});
            let lingrad = ctx.createLinearGradient(0, 174 * px, 0, 161 * px);
            lingrad.addColorStop(0, color[0]);
            lingrad.addColorStop(1, transparent);
            ctx.strokeStyle = lingrad;
            ctx.lineWidth = 2 * px;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 40 * px, 0, 2 * Math.PI);
            ctx.stroke();
            for (let j = 0; j < 3; ++j) {
                lingrad = ctx.createLinearGradient(centerX + tri[0][j] * px, tri[1][j] * px, centerX + tri[2][j] * px, tri[3][j] * px);
                lingrad.addColorStop(0, color[0 + mouseOn]);
                lingrad.addColorStop(1, transparent);
                ctx.strokeStyle = lingrad;
                ctx.beginPath();
                ctx.arc(centerX + tri[4][j], centerY + tri[5][j], 26, 0, 2 * Math.PI);
                ctx.stroke();
            }
            if (this.data.path.numbers[i] > 0) {
                let img = this.images[this.data.path.numbers[i].toString()];
                ctx.drawImage(img, 25, 30, 160, 160, centerX - 34.5 * px, centerY - 34.5 * px, 69 * px, 69 * px);
            }
        });
    }
    drawLineCircle() {
        let c = this.canvas;
        let ctx = c.getContext('2d');
        
        let px = c.height / 640;

        let x = [60, 385, 385];
        let y = [
            [350.5, 438.5, 526.5],
            [247.5, 350.5],
            [438, 482, 526]
        ];
        let r = [
            [22.5, 22.5, 13, 30],
            [11, 11, 11, 15]
        ];
        // 순서대로 미선택, 정밀, 지배, 마법, 결의, 영감
        let color = ['#A9A487', '#C9BA8E', '#CF4141', '#9CA7F6', '#9ED084', '#48A7B5', '#CEBD80'];
        let mouseOn = this.mouseOn === 'lineCircle';
        
        ctx.lineWidth = 2 * px;
        // let radgrad = ctx.createRadialGradient(centerX, centerY, 8, centerX, centerY, 0);
        // radgrad.addColorStop(0.15, 'rgb(36, 36, 36)');
        // radgrad.addColorStop(1, 'rgba(' + colors[colorIndex].join(',') + ', 1)');
        this.data.path.numbers.forEach((n, i) => {
            ctx.strokeStyle = color[n];
            // keystone
            if (i === 0) {
                if (this.data.primary.numbers[0] !== 0) {
                    if (this.mode === 0) {
                        ctx.beginPath();
                        ctx.fillStyle = '#1E2328';
                        ctx.arc(60 * px, 253 * px, r[this.mode][3], 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();
                        let img = this.images[100 * n + this.data.primary.numbers[0]];
                        ctx.drawImage(img, 60 - 55, 253 - 55, 110, 110);
                    } else {
                        ctx.beginPath();
                        ctx.fillStyle = '#1E2328';
                        ctx.arc(60 * px, 253 * px, 11, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();
                        
                        ctx.beginPath();
                        let lingrad = ctx.createLinearGradient(0, 248, 0, 258);
                        lingrad.addColorStop(0, 'white');
                        lingrad.addColorStop(1, color[n]);
                        ctx.fillStyle = lingrad;
                        ctx.arc(60 * px, 253 * px, 5, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                } else {
                    ctx.beginPath();
                    ctx.fillStyle = '#1E2328';
                    ctx.arc(60 * px, 253 * px, r[this.mode][3], 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                }
            }
            y[i].forEach((v, i2) => {
                let centerX = x[i] * px;
                let centerY = v * px;
                let num = this.data[['primary', 'secondary', 'bonus'][i]].numbers[i === 0 ? i2 + 1 : i2];
                if (num !== 0) {
                    if (this.mode === 0) {
                        ctx.beginPath();
                        ctx.fillStyle = '#1E2328';
                        ctx.arc(centerX, centerY, r[this.mode][i], 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();
                        if (i === 2) {
                            let img = this.images[100 * n + 10 * i2 + num];
                            ctx.drawImage(img, centerX - 13, centerY - 13, 26, 26);
                        } else {
                            let img = this.images[100 * n + num];
                            ctx.drawImage(img, centerX - 21.5, centerY - 21.5, 43, 43);
                        }
                    } else {
                        ctx.beginPath();
                        ctx.fillStyle = '#1E2328';
                        ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();

                        ctx.beginPath();
                        let lingrad = ctx.createLinearGradient(0, centerY - 4, 0, centerY + 4);
                        lingrad.addColorStop(0, 'white');
                        lingrad.addColorStop(1, color[n]);
                        ctx.fillStyle = lingrad;
                        ctx.arc(centerX, centerY, 3.8, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                } else {
                    ctx.beginPath();
                    ctx.fillStyle = '#1E2328';
                    ctx.arc(centerX, centerY, r[this.mode][i], 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                }
            });
        });
    }
    makeButton() {
        let c = this.canvas;
        let ctx = c.getContext('2d');
        let px = c.height / 640;
        
        let path = this.data.path;
        let primaryNum = path.numbers[0];
        let secondaryNum = path.numbers[1];

        const mouseOnField = (cx, cy, dw, dh) => {
            let x = this.mousePos.x;
            let y = this.mousePos.y;
            return x >= cx - dw && x <= cx + dw && y >= cy - dh && y <= cy + dh;
        }

        // path
        const click1 = () => {
            if (this.mode === 0) {
                if (mouseOnField(60, 133, 40, 40)) {
                    // c.removeEventListener('click', click1);
                    this.data.path.active[0] ^= true;
                    this.set();
                }
                if (mouseOnField(385, 133, 40, 40)) {
                    // c.removeEventListener('click', click1);
                    this.data.path.active[1] ^= true;
                    this.set();
                }
            }
        };
        // lineCircle
        const click2 = () => {
            let x = [60, 385, 385];
            let y = [
                [350.5, 438.5, 526.5],
                [247.5, 350.5],
                [438, 482, 526]
            ];
            let r = [22.5, 22.5, 13, 30];
            if (this.mode === 0) {
                this.data.path.numbers.forEach((n, i) => {
                    // keystone
                    if (i === 0) {
                        if (mouseOnField(60 * px, 253 * px, r[3], r[3])) {
                        //     c.removeEventListener('click', click2);
                            // console.log('?');
                            this.data.primary.active[0] ^= true;
                            this.set();
                        }
                    }
                    if (n !== 0) {
                        y[i].forEach((v, i2) => {
                            let centerX = x[i] * px;
                            let centerY = v * px;
                            if (mouseOnField(centerX, centerY, r[i], r[i])) {
                                this.data[['primary', 'secondary', 'bonus'][i]].active[i === 0 ? i2 + 1 : i2] ^= true;
                                if (this.data.secondary.active.every(b => b)) this.data.secondary.active = [false, false];
                                this.set();
                            }
                        });
                    }
                });
            }
        };
        // path2
        const click3 = () => {
            if (path.active[0] || this.mode === 1) {
                [133, 172, 212, 252, 291].forEach((v, i) => {
                    let centerX = v * px;
                    let centerY = 133.5 * px;
                    if (mouseOnField(centerX, centerY, 19, 19)) {
                        if (i + 1 !== path.numbers[0]) {
                            path.numbers[0] = i + 1;
                            if (path.numbers[1] === i + 1) {
                                path.numbers[1] = 0;
                                this.data.secondary.numbers = [0, 0];
                            }
                            this.data.primary.numbers = [0, 0, 0, 0];
                            this.renewActive();
                            this.set();
                        }
                    }
                });
            }
            if (path.active[1] || this.mode === 1) {
                [463, 512, 562, 611].forEach((v, i) => {
                    let centerX = v * px;
                    let centerY = 133.5 * px;
                    let i_ = i + 1 < this.data.path.numbers[0] ? i + 1 : i + 2;
                    if (mouseOnField(centerX, centerY, 19, 19)) {
                        if (i_ !== path.numbers[1]) {
                            path.numbers[1] = i_;
                            this.data.secondary.numbers = [0, 0];
                            this.renewActive();
                            this.set();
                        }
                    }
                });
            }
        };
        // primary
        const click4 = () => {
            this.data.primary.active.forEach((b, i) => {
                if (b || this.mode === 1) {
                    // has4: 룬 항목이 4개면 1, 3개면 0
                    // 룬 항목 4개인 친구는 1핵심룬, 2핵심룬, 2slot3
                    let has4 = (path.numbers[0] < 3 && i === 0) || (path.numbers[0] === 2 && i === 3);
                    [[146, 212, 278], [138, 187, 237, 286]][+has4].forEach((v, i2) => {
                        let centerX = v * px;
                        let centerY = [253, 350, 438, 526][i] * px;
                        if (mouseOnField(centerX, centerY, 17, 17)) {
                            this.data.primary.numbers[i] = 10 * i + i2 + 1;
                            this.renewActive();
                            this.set();
                        }
                    });
                }
            });
        };
        // secondary
        const click5 = () => {
            if (this.data.secondary.active.some(b => b) || this.mode === 1) {
                for (let i = 0; i < 3; ++i) {
                    // has4: 룬 항목이 4개면 1, 3개면 0
                    // 룬 항목 4개인 친구는 2slot3
                    let has4 = this.data.path.numbers[1] === 2 && i === 2;
                    [[471, 537, 603], [463, 512, 562, 611]][+has4].forEach((v, i2) => {
                        let centerX = v * px;
                        let centerY = [223, 301, 379][i] * px;
                        if (mouseOnField(centerX, centerY, 17, 17)) {
                            // 둘다 0이면, 맨 앞에 채워넣고
                            // 뒤에만 0이면, 누른 거랑 첫번째랑 10의 자리 같으면 걔 자리로,
                            // 다르면 뒤에 채워넣고
                            // 다 차 있으면, 누른 거랑 다 비교해서 10자리 같으면 걔 자리로,
                            // 다르면 앞에꺼 날리고 뒤에꺼 앞으로 땡기고 뒤에 채워넣고
                            let n = 10 * i + i2 + 11;
                            let numbers = this.data.secondary.numbers;
                            if (numbers.every(v => v === 0)) {
                                numbers[0] = n;
                            } else if (numbers[1] === 0) {
                                if (Math.round((numbers[0] - n) / 10) === 0) numbers[0] = n;
                                else numbers[1] = n;
                            } else {
                                if (Math.round((numbers[0] - n) / 10) === 0) {
                                    numbers[0] = n;
                                } else if (Math.round((numbers[1] - n) / 10) === 0) {
                                    numbers[1] = n;
                                } else {
                                    numbers[0] = numbers[1];
                                    numbers[1] = n;
                                }
                            }
                            this.renewActive();
                            this.set();
                        }
                    });
                }
            }
        };
        // bonus
        const click6 = () => {
            this.data.bonus.active.forEach((b, i) => {
                if (b) {
                    ctx.fillStyle = '#1E2328';
                    [471, 537, 603].forEach((v, i2) => {
                        let centerX = v * px;
                        let centerY = [438, 482, 526][i] * px;
                        if (mouseOnField(centerX, centerY, 13, 13)) {
                            this.data.bonus.numbers[i] = i2 + 1;
                            this.renewActive();
                            this.set();
                        }
                    });
                }
            });
        };
        // mode changer
        const click7 = () => {
            if (mouseOnField(36.5 + 12.5, c.height + 584.5 - 640 + 11.5, 12.5, 11.5)) {
                this.mode = 0;
                this.set();
            }
            if (mouseOnField(61.5 + 12, c.height + 584.5 - 640 + 11.5, 12, 11.5)) {
                this.mode = 1;
                this.set();
            }
        };

        c.addEventListener('click', click1);
        c.addEventListener('click', click2);
        c.addEventListener('click', click3);
        c.addEventListener('click', click4);
        c.addEventListener('click', click5);
        c.addEventListener('click', click6);
        c.addEventListener('click', click7);
    }
    renewActive() {
        let data = this.data;
        let order = ['primary', 'path', 'secondary', 'bonus'];
        let effective = true;
        order.forEach(key => {
            data[key].numbers.forEach((v, i) => {
                if (v === 0 && effective) {
                    data[key].active[i] = true;
                    effective = false;
                } else {
                    data[key].active[i] = false;
                }
            })
        });
        this.finished = effective;
    }
    drawRuneCircle() {
        let c = this.canvas;
        let ctx = c.getContext('2d');
        let px = c.height / 640;

        let color = ['#F0E6D2', '#C9BA8E', '#CF4141', '#9CA7F6', '#9ED084', '#48A7B5', '#A9A487'];

        // rune4: 룬 항목이 4개면 1, 3개면 0
        // 룬 항목 4개인 친구는 1핵심룬, 2핵심룬, 2slot3
        // let rune4 = (this.primary.path == 1 && key === 'keystone') || (this.primary.path === 2 && key === 'keystone') || (this.primary.path === 2 && key === 'slot3');
        let y = [
            // y[path][y[0].findIndex(v => v === key)]
            [253, 350, 438, 526],
            [223, 301, 379],
            [438, 482, 526]
        ];
        let x = [
            // x[+(path === 1)][+rune4]
            [[146, 212, 278], [138, 187, 237, 286]],
            [[471, 537, 603], [463, 512, 562, 611]],
        ]
        
        const divLine = (startX, startY) => {
            let x1 = [-3, -6, -3, 0, 192, 195, 198, 195, 192];
            let y1 = [-3, 0, 3, 0, 0, -3, 0, 3, 0]
            ctx.beginPath();
            ctx.strokeStyle = '#614A25';
            ctx.lineWidth = 1;
            ctx.moveTo(startX, startY);
            for (let i = 0; i < 9; ++i) {
                ctx.lineTo(startX + x1[i], startY + y1[i]);
            }
            ctx.stroke();
        };


        // 모드0이면 active true일때만 룬을 그린다.
        // 모드1이면 active 관계 없이 룬을 그리고
        // 보조 빌드가 미선택일 경우 그리지 않는다.

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        let path = this.data.path;
        let primaryNum = path.numbers[0];
        let secondaryNum = path.numbers[1];
        if (this.mode === 0) {
            // path
            if (path.active[0]) {
                [133, 172, 212, 252, 291].forEach((v, i) => {
                    let centerX = v * px;
                    let centerY = 133.5 * px;
                    let img = this.images[(i + 1).toString()];
                    ctx.drawImage(img, 25, 30, 160, 160, centerX - 25 * px, centerY - 25 * px, 50 * px, 50 * px);
                    if (i + 1 === primaryNum) {
                        ctx.beginPath();
                        ctx.strokeStyle = 'tan';
                        ctx.lineWidth = 2 * px;
                        ctx.arc(centerX, centerY, 21 * px, 0, 2 * Math.PI);
                        ctx.stroke();
                    }
                });
            } else {
                // 설명충
                ctx.fillStyle = color[primaryNum];
                ctx.font = 'bold 13px GoyangIlsan';
                ctx.fillText(this.list.build[primaryNum].name, 113, 101);
                ctx.fillStyle = color[6];
                ctx.font = '12px GoyangIlsan';
                ctx.fillText(this.list.build[primaryNum].caption, 113, 120);
                ctx.fillText(this.list.build[primaryNum].description, 113, 136);
            }
            if (path.active[1]) {
                [463, 512, 562, 611].forEach((v, i) => {
                    let centerX = v * px;
                    let centerY = 133.5 * px;
                    let i_ = i + 1 < this.data.path.numbers[0] ? i + 1 : i + 2;
                    let img = this.images[i_.toString()];
                    ctx.drawImage(img, 25, 30, 160, 160, centerX - 25 * px, centerY - 25 * px, 50 * px, 50 * px);
                    if (i_ === path.numbers[1]) {
                        ctx.beginPath();
                        ctx.strokeStyle = 'tan';
                        ctx.lineWidth = 2 * px;
                        ctx.arc(centerX, centerY, 21 * px, 0, 2 * Math.PI);
                        ctx.stroke();
                    }
                });
            } else {
                // 설명충
                ctx.fillStyle = color[secondaryNum];
                ctx.font = 'bold 13px GoyangIlsan';
                ctx.fillText(this.list.build[secondaryNum].name, 438, 101);
                ctx.fillStyle = color[6];
                ctx.font = '12px GoyangIlsan';
                ctx.fillText(this.list.build[secondaryNum].caption, 438, 120);
                ctx.fillText(this.list.build[secondaryNum].description, 438, 136);
            }
            // primary
            ctx.strokeStyle = color[primaryNum];
            ctx.lineWidth = 2 * px;
            this.data.primary.active.forEach((b, i) => {
                if (b) {
                    // has4: 룬 항목이 4개면 1, 3개면 0
                    // 룬 항목 4개인 친구는 1핵심룬, 2핵심룬, 2slot3
                    ctx.fillStyle = '#1E2328';
                    let has4 = (primaryNum < 3 && i === 0) || (primaryNum === 2 && i === 3);
                    x[0][+has4].forEach((v, i2) => {
                        let centerX = v * px;
                        let centerY = y[0][i] * px;
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, 18 * px, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();
                        let img = this.images[100 * primaryNum + 10 * i + i2 + 1];
                        if (i === 0) ctx.drawImage(img, centerX - 34, centerY - 34, 68, 68);
                        else ctx.drawImage(img, centerX - 17, centerY - 17, 34, 34);
                    });
                } else {
                    // 설명충
                    ctx.fillStyle = color[primaryNum];
                    if (i === 0) {
                        // keystone
                        let keystoneNum = this.data.primary.numbers[i];
                        if (keystoneNum === 0) {
                            // 핵심 룬 선택이 안 되어있으면
                            ctx.fillStyle = color[6];
                            ctx.font = '12px GoyangIlsan';
                            ctx.fillText(this.list.selectmsg.keystone, 113, 223);
                        } else {
                            // 핵심 룬 선택 돼있으면
                            ctx.font = 'bold 15px GoyangIlsan';
                            ctx.fillText(this.list.build[primaryNum].keystone[keystoneNum].name, 113, 220);
                            ctx.fillStyle = color[6];
                            ctx.font = '12px GoyangIlsan';
                            ctx.fillTextNewLine(this.list.build[primaryNum].keystone[keystoneNum].description, 113, 241, 36);
                        }
                    } else {
                        let num = this.data.primary.numbers[i] % 10;
                        if (num === 0) {
                            ctx.font = 'bold 13px GoyangIlsan';
                            ctx.fillText(this.list.build[primaryNum]['slot' + (i - 1)].name, 113, y[0][i] - 24);
                            ctx.fillStyle = color[6];
                            ctx.font = '12px GoyangIlsan';
                            ctx.fillText(this.list.selectmsg.primary, 113, y[0][i] - 5);
                        } else {
                            ctx.font = 'bold 13px GoyangIlsan';
                            ctx.fillText(this.list.build[primaryNum]['slot' + (i - 1)][num].name, 113, y[0][i] - 24);
                            ctx.fillStyle = color[6];
                            ctx.font = '12px GoyangIlsan';
                            ctx.fillTextNewLine(this.list.build[primaryNum]['slot' + (i - 1)][num].description, 113, y[0][i] - 5, 36);
                        }
                    }
                }
            });
            // secondary
            if (this.data.secondary.active.some(b => b)) {
                for (let i = 0; i < 3; ++i) {
                    // has4: 룬 항목이 4개면 1, 3개면 0
                    // 룬 항목 4개인 친구는 2slot3
                    let has4 = this.data.path.numbers[1] === 2 && i === 2;
                    x[1][+has4].forEach((v, i2) => {
                        let centerX = v * px;
                        let centerY = y[1][i] * px;
                        ctx.beginPath();
                        ctx.fillStyle = '#1E2328';
                        ctx.strokeStyle = color[path.numbers[1]];
                        ctx.lineWidth = 2 * px;
                        ctx.arc(centerX, centerY, 18 * px, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();
                        let img = this.images[100 * secondaryNum + 10 * i + i2 + 11];
                        ctx.drawImage(img, centerX - 17, centerY - 17, 34, 34);
                    });
                }
            } else {
                // 설명충
                // 보조 빌드가 미선택이면 색 빼고 selectmsg로 전부 보내버리고
                // 선택돼있으면 색 넣고 보조 룬 선택 여부에 따라 설명 넣든가 보내든가
                this.data.secondary.numbers.forEach((n, i) => {
                    ctx.fillStyle = color[secondaryNum];
                    ctx.font = 'bold 13px GoyangIlsan';
                    if (secondaryNum === 0) {
                        ctx.fillText(this.list.selectmsg.secondarytitle, 438, 221 + 104 * i);
                        ctx.fillStyle = color[6];
                        ctx.font = '12px GoyangIlsan';
                        ctx.fillText(this.list.selectmsg.secondary1, 438, 241 + 104 * i);
                    } else {
                        if (n === 0) {
                            ctx.fillText(this.list.selectmsg.secondarytitle, 438, 221 + 104 * i);
                            ctx.fillStyle = color[6];
                            ctx.font = '12px GoyangIlsan';
                            ctx.fillText(this.list.selectmsg.secondary2, 438, 241 + 104 * i);
                        } else {
                            let slot = (n / 10 - 1) >> 0, num = n % 10;
                            let rune = this.list.build[secondaryNum]['slot' + slot][num];
                            ctx.fillText(rune.name, 438, 221 + 104 * i);
                            ctx.fillStyle = color[6];
                            ctx.font = '12px GoyangIlsan';
                            ctx.fillTextNewLine(rune.description, 438, 241 + 104 * i, 36);
                        }
                    }
                });
            }
            // bonus
            this.data.bonus.active.forEach((b, i) => {
                if (b) {
                    ctx.fillStyle = '#1E2328';
                    x[1][0].forEach((v, i2) => {
                        let centerX = v * px;
                        let centerY = y[2][i] * px;
                        ctx.beginPath();
                        ctx.strokeStyle = color[6];
                        ctx.lineWidth = 2 * px;
                        ctx.arc(centerX, centerY, 13 * px, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();
                        let img = this.images[601 + 10 * i + i2];
                        ctx.drawImage(img, centerX - 12.5, centerY - 12.5, 25, 25);
                    });
                } else {
                    // 설명충
                    ctx.fillStyle = color[6];
                    ctx.font = 'bold 13px GoyangIlsan';
                    ctx.fillText(this.list.bonus.name[i], 438, y[2][i] - 16);
                    ctx.font = '12px GoyangIlsan';
                    let num = this.data.bonus.numbers[i];
                    if (num === 0) {
                        ctx.fillText(this.list.selectmsg.bonus, 438, y[2][i] + 3);
                    } else {
                        ctx.fillText(this.list.bonus[num][i], 438, y[2][i] + 3);
                    }
                }
            });
            // line
            let active = this.data.primary.active;
            if (active[1] || active[2]) divLine(116, 394.5);
            if (active[2] || active[3]) divLine(116, 482.5);
            active = this.data.secondary.active;
            if (active[0] || active[1]) {
                divLine(441, 262.5);
                divLine(441, 340.5);
            }
            active = this.data.bonus.active;
            if (active[0] || active[1]) divLine(441, 460.5);
            if (active[1] || active[2]) divLine(441, 504.5);
        } else {
            // path
            let path = this.data.path;
            [133, 172, 212, 252, 291].forEach((v, i) => {
                let centerX = v * px;
                let centerY = 133.5 * px;
                let img = this.images[(i + 1).toString()];
                ctx.drawImage(img, 25, 30, 160, 160, centerX - 25 * px, centerY - 25 * px, 50 * px, 50 * px);
                if (i + 1 === path.numbers[0]) {
                    ctx.beginPath();
                    ctx.strokeStyle = 'tan';
                    ctx.lineWidth = 2 * px;
                    ctx.arc(centerX, centerY, 21 * px, 0, 2 * Math.PI);
                    ctx.stroke();
                }
            });
            [463, 512, 562, 611].forEach((v, i) => {
                let centerX = v * px;
                let centerY = 133.5 * px;
                let i_ = i + 1 < path.numbers[0] ? i + 1 : i + 2;
                let img = this.images[i_.toString()];
                ctx.drawImage(img, 25, 30, 160, 160, centerX - 25 * px, centerY - 25 * px, 50 * px, 50 * px);
                if (i_ === path.numbers[1]) {
                    ctx.beginPath();
                    ctx.strokeStyle = 'tan';
                    ctx.lineWidth = 2 * px;
                    ctx.arc(centerX, centerY, 21 * px, 0, 2 * Math.PI);
                    ctx.stroke();
                }
            });
            
            // primary
            ctx.fillStyle = '#1E2328';
            this.data.primary.active.forEach((b, i) => {
                // has4: 룬 항목이 4개면 1, 3개면 0
                // 룬 항목 4개인 친구는 1핵심룬, 2핵심룬
                let has4 = this.data.path.numbers[0] < 3 && i === 0;
                x[0][+has4].forEach((v, i2) => {
                    let centerX = v * px;
                    let centerY = y[0][i] * px;
                    ctx.beginPath();
                    ctx.strokeStyle = color[path.numbers[0]];
                    ctx.lineWidth = 2 * px;
                    ctx.arc(centerX, centerY, 18 * px, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                    let img = this.images[100 * primaryNum + 10 * i + i2 + 1];
                    if (i === 0) ctx.drawImage(img, centerX - 34, centerY - 34, 68, 68);
                    else ctx.drawImage(img, centerX - 17, centerY - 17, 34, 34);
                });
            });
            // secondary
            if (path.numbers[1] !== 0) {
                for (let i = 0; i < 3; ++i) {
                    // has4: 룬 항목이 4개면 1, 3개면 0
                    // 룬 항목 4개인 친구는 2slot3
                    let has4 = this.data.path.numbers[1] === 2 && i === 2;
                    x[1][+has4].forEach((v, i2) => {
                        let centerX = v * px;
                        let centerY = y[1][i] * px;
                        ctx.beginPath();
                        ctx.strokeStyle = color[path.numbers[1]];
                        ctx.lineWidth = 2 * px;
                        ctx.arc(centerX, centerY, 18 * px, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();
                        let img = this.images[100 * secondaryNum + 10 * i + i2 + 11];
                        ctx.drawImage(img, centerX - 17, centerY - 17, 34, 34);
                    });
                }
            } else {
                // 설명충
                ctx.fillStyle = color[0];
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.font = 'bold 13px GoyangIlsan';
                ctx.fillText(this.list.selectmsg.secondarytitle, 438, 221);
                ctx.fillText(this.list.selectmsg.secondarytitle, 438, 325);
                ctx.fillStyle = color[6];
                ctx.font = '12px GoyangIlsan';
                ctx.fillText(this.list.selectmsg.secondary1, 438, 241);
                ctx.fillText(this.list.selectmsg.secondary1, 438, 345);
            }
            // bonus
            this.data.bonus.active.forEach((b, i) => {
                x[1][0].forEach((v, i2) => {
                    let centerX = v * px;
                    let centerY = y[2][i] * px;
                    ctx.beginPath();
                    ctx.fillStyle = '#1E2328';
                    ctx.strokeStyle = color[6];
                    ctx.lineWidth = 2 * px;
                    ctx.arc(centerX, centerY, 13 * px, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                    let img = this.images[601 + 10 * i + i2];
                    ctx.drawImage(img, centerX - 12.5, centerY - 12.5, 25, 25);
                });
            });
            // line
            divLine(116, 394.5);
            divLine(116, 482.5);
            if (this.data.path.numbers[1] !== 0) {
                divLine(441, 262.5);
                divLine(441, 340.5);
            }
            divLine(441, 460.5);
            divLine(441, 504.5);
        }
    }
}