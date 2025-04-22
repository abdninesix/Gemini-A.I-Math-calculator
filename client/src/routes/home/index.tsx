import { useEffect, useRef, useState } from "react"
import { SWATCHES } from "./constants"
import { ColorSwatch, Group } from "@mantine/core"
import axios from 'axios'

interface Response {
    expr: string;
    result: string;
    assign: boolean;
}

interface GeneratedResult {
    expression: string;
    answer: string;
}

export default function Home() {

    const sendData = async () => {

        const canvas = canvasRef.current;

        if (canvas) {
            const response = await axios({
                method: 'post',
                url: `${import.meta.env.VITE_API_URL}/calculate`,
                data: {
                    image: canvas.toDataURL('image/png'),
                    dict_of_vars: dictOfVars,
                }
            });

            const resp = await response.data;
            resp.data.forEach((data: Response) => {
                if (data.assign === true) {
                    // dict_of_vars[resp.result] = resp.answer;
                    setDictOfVars({
                        ...dictOfVars,
                        [data.expr]: data.result
                    });
                }
            });
            const ctx = canvas.getContext('2d');
            const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    if (imageData.data[i + 3] > 0) {  // If pixel is not transparent
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            //setLatexPosition({ x: centerX, y: centerY });
            resp.data.forEach((data: Response) => {
                setTimeout(() => {
                    setResult({
                        expression: data.expr,
                        answer: data.result
                    });
                }, 1000);
            });
        }
    };

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [color, setColor] = useState('rgb(255,255,255)')
    const [reset, setReset] = useState(false)
    const [result, setResult] = useState<GeneratedResult>()
    const [latexExpression, setLatexExpression] = useState<Array<String>>([])
    //const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 })
    const [dictOfVars, setDictOfVars] = useState({})

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setReset(false)
        }
    }, [reset])

    useEffect(() => {
        if (latexExpression.length > 0 && window.MathJax) {
            setTimeout(() => {
                window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExpression]);

    useEffect(() => {
        if (result) {
            renderLatexToCanvas(result.expression, result.answer);
        }
    }, [result]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - canvas.offsetTop;
                ctx.lineCap = 'round';
                ctx.lineWidth = 3;
            }
        }

        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true
        document.head.appendChild(script)

        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
            });
        };

        return () => {
            document.head.removeChild(script);
        };
    }, []);

    const renderLatexToCanvas = (expression: string, answer: string) => {
        //const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
        const latex = `\\(\\LARGE{\\text{${expression} = ${answer}}}\\)`;
        setLatexExpression([...latexExpression, latex]);
        // Clear the main canvas
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

    const resetCanvas = () => {
        const canvas = canvasRef.current
        if (canvas) {
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    }

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.beginPath();
                ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                setIsDrawing(true)
            }
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false)
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) {
            return
        }
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = color
                ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                ctx.stroke();
            }
        }
    };

    const startTouchDrawing = (e: React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                const touch = e.touches[0];
                const rect = canvas.getBoundingClientRect();
                ctx.beginPath();
                ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                setIsDrawing(true);
            }
        }
    };

    const touchDraw = (e: React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                const touch = e.touches[0];
                const rect = canvas.getBoundingClientRect();
                ctx.strokeStyle = color;
                ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                ctx.stroke();
            }
        }
    };

    const endTouchDrawing = () => {
        setIsDrawing(false);
    };


    return (
        <div className="h-screen w-screen flex flex-col items-center px-4 md:px-20 lg:px-40 py-4 bg-gray-300">

            <div className="w-full flex justify-between gap-5">
                <Group className="w-full p-2 flex items-center justify-center">
                    {SWATCHES.map((swatchColor: string) => (
                        <ColorSwatch key={swatchColor} color={swatchColor} onClick={() => setColor(swatchColor)} className={`ring-2 shadow-md ${color === swatchColor ? 'ring-4 ring-white' : 'ring-transparent'}`} />
                    ))}
                </Group>
                <button onClick={() => setReset(true)} className="z-20 p-2 rounded-md size-fit bg-red-500 text-white shadow-md">Reset</button>
                <button onClick={sendData} className="z-20 p-2 rounded-md size-fit bg-blue-500 text-white shadow-md">Analyze</button>
            </div>

            <canvas
                ref={canvasRef}
                id='canvas'
                className="absolute touch-none top-0 left-0 w-full h-full"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onTouchStart={startTouchDrawing}
                onTouchMove={touchDraw}
                onTouchEnd={endTouchDrawing}
            />

            {latexExpression && latexExpression.map((latex, index) => (
                <div key={index} className="flex flex-col p-2 text-black text-xs drop-shadow-sm">
                    {latex}
                </div>
            ))}

        </div>
    )
}