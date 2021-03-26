module.exports = [
    {
        title: 'Weed',
        totalGenerations: 2,
        variables: '',
        start: 'X',
        initY: 400,
        initX: 0,
        rules: 'X -> C1F[C3+X]F[C3-X]+X\nF->C4FF',
        angle: 40,
        canvasWidth: 1000,
        canvasHeight: 760,
        turtleStepX: 10,
        turtleStepY: 10,
        wrapAngleAt: 0,
        lineWidth: 11,
        initially: function () {
            this.ctx.rotate(
                (180 * Math.PI / 180)
            );
        }
    },

    {
        title: 'Kock Ring Squared',
        variables: '',
        rules: 'F -> FF-F-F-F-FF\n',
        start: 'F-F-F-F',
        angle: 90,
        totalGenerations: 4,
        canvasWidth: 500,
        canvasHeight: 500,
        turtleStepX: 5,
        turtleStepY: 5,
        wrapAngleAt: 0,
        lineWidth: 1
    },

    {
        title: 'Kock Ring',
        variables: '',
        rules: 'F -> C0FF-F-F-F-F-FC1+F\n',
        start: 'F-F-F-F',
        angle: 90,
        totalGenerations: 4,
        initX: 360,
        initY: 360,
        canvasWidth: 500,
        canvasHeight: 500,
        turtleStepX: 2,
        turtleStepY: 2,
        wrapAngleAt: 0,
        lineWidth: 1
    },

    {
        title: 'Tree Balanced',
        variables: '',
        rules: 'X -> C0FF[+X][-X]C1FC2X\n' +
            'F -> FF\n',
        start: 'X',
        angle: 40,
        initX: 0,
        initY: 0,
        canvasWidth: 900,
        canvasHeight: 600,
        turtleStepX: 5,
        turtleStepY: 5,
        totalGenerations: 5,
        wrapAngleAt: 0,
        lineWidth: 0.4,
        time_scale_lines: 5
    },

    { // list all, even unused, keys on this first eleemnt
        title: 'Parametric test',
        variables: "#define $W 0.5\n" +
            "#define $AS  2\n" +
            "#define $BS  1\n" +
            "#define $R   1\n" +
            "#define $L  -1",
        rules: "F($s,$o) : $s == $AS && $o == $R -> F($AS,$L)F($BS,$R)\n" +
            "F($s,$o) : $s == $AS && $o == $L -> F($BS,$L)F($AS,$R)\n" +
            "F($s,$o) : $s == $BS                -> F($AS,$o)\n",
        start: "!($W)F($BS,$R)",
        angle: 22,
        initX: 120,
        initY: 120,
        canvasWidth: 1000,
        canvasHeight: 1000,
        turtleStepX: 4,
        turtleStepY: 4,
        totalGenerations: 10,
        lineWidth: 4
    },

    {
        title: 'Tree 1',
        variables: '',
        rules: 'F->C0FF-[C1-F+F+F]+[C2+F-F-F]',
        start: 'F',
        angle: 22,
        initX: 0,
        initY: 0,
        canvasWidth: 1000,
        canvasHeight: 1000,
        turtleStepX: 4,
        turtleStepY: 4,
        totalGenerations: 5,
        lineWidth: 1,
        wrapAngleAt: 12
    },

    {
        title: 'Tree x',
        variables: '',
        rules: "X->C0F-[C2[X]+C3X]+C1F[C3+FX]-X\nF->FF",
        start: 'X',
        angle: 27,
        initX: 0,
        initY: 0,
        canvasWidth: 1000,
        canvasHeight: 1000,
        turtleStepX: 8,
        turtleStepY: 8,
        totalGenerations: 6,
        lineWidth: 3,
        wrapAngleAt: 12
    }, {
        title: 'Tree x',
        variables: '',
        rules: "X->C0F-[C2[X]+C3X]+C1F[C3+FX]-X\nF->FF",
        start: 'X',
        angle: 27,
        initX: 0,
        initY: 0,
        canvasWidth: 1000,
        canvasHeight: 1000,
        turtleStepX: 8,
        turtleStepY: 8,
        totalGenerations: 6,
        lineWidth: 3,
        wrapAngleAt: 12
    },

    {
        title: 'Sierpinski Median Curve (2 gens)',
        variables: '',
        rules: "L->+R-F-R+\nR->-L+F+L-",
        start: 'L--F--L--F',
        angle: 45,
        initX: 0,
        initY: 0,
        canvasWidth: 1000,
        canvasHeight: 1000,
        turtleStepX: 10,
        turtleStepY: 10,
        totalGenerations: 2,
        lineWidth: 3,
        wrapAngleAt: 12
    },

    {
        title: 'Sierpinski Median Curve (4 gens)',
        variables: '',
        rules: "L->+R-F-R+\nR->-L+F+L-",
        start: 'L--F--L--F',
        angle: 45,
        initX: 0,
        initY: 0,
        canvasWidth: 1000,
        canvasHeight: 1000,
        turtleStepX: 10,
        turtleStepY: 10,
        totalGenerations: 4,
        lineWidth: 3,
        wrapAngleAt: 12
    },

    {
        title: 'Koch Snowflake',
        variables: '',
        rules: "F->F-F++F-F\nX->FF",
        start: 'F++F++F',
        angle: 60,
        initX: 0,
        initY: 0,
        canvasWidth: 1000,
        canvasHeight: 1000,
        turtleStepX: 4,
        turtleStepY: 4,
        totalGenerations: 4,
        lineWidth: 6,
        wrapAngleAt: 12
    },

    {
        title: 'Tree 3',
        variables: '',
        rules: 'F -> FF-[-F+F]+[+F-F]',
        start: 'F',
        angle: 22,
        initX: 0,
        initY: 0,
        canvasWidth: 1000,
        canvasHeight: 1000,
        turtleStepX: 4,
        turtleStepY: 4,
        totalGenerations: 5,
        wrapAngleAt: 12
    },

    {
        title: 'Tree 4',
        variables: '',
        rules: "F -> F[-FF]F[+FF]F",
        start: 'F',
        angle: 22,
        initX: 0,
        initY: 0,
        canvasWidth: 1000,
        canvasHeight: 1000,
        turtleStepX: 4,
        turtleStepY: 4,
        totalGenerations: 5,
        wrapAngleAt: 12
    },

    {
        title: 'Dragon Curve',
        variables: '',
        rules: "X->X+YF\nY->FX-Y",
        start: 'FX',
        angle: 90,
        initX: 800,
        initY: 100,
        canvasWidth: 1000,
        canvasHeight: 1000,
        turtleStepX: 5,
        turtleStepY: 5,
        totalGenerations: 7,
        lineWidth: 8,
        wrapAngleAt: 12
    }
];
