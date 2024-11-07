import math

def create_path(x0,y0, ho, c, topcurve, innercurve, r):
    hi = ho - c* ((1/math.sqrt(2) -1)*r +1)
    assert hi == ho-c
    # hi = ho - c
    bigc = c + (c+hi-ho)
    assert bigc == c
    return f"M{x0} {y0}v-{ho}c0 -{c*topcurve} {c} -{c*topcurve} {c} 0v{hi}c0 {c*(1-innercurve)} {c*innercurve} {c} {c} {c}h{hi}c{c*topcurve} 0 {c*topcurve} {c} 0 {c}h-{ho}c-{bigc*(1-innercurve)} 0 -{bigc} -{bigc*innercurve} -{bigc} -{bigc}Z"

def create_2path(viewbox, rate=0.5, split=0.8, innercurve=0.3, distance=1.7):
    total_size = viewbox * rate
    ho = total_size * split
    c = total_size * (1-split)
    x0 = (viewbox - total_size) * 0.5
    y0 = viewbox - x0 -c
    topcurve = 0
    r=0
    c2 = c* distance
    return f"{create_path(x0,y0, ho, c, topcurve, innercurve, r)}{create_path(x0 + c2,y0 - c2, ho -c2, c, topcurve, innercurve, r)}"

def create_svg(viewbox):
    with open("test.svg", "w") as f:
        f.write(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {viewbox} {viewbox}">
        <rect width="{viewbox}" height="{viewbox}" fill="#f0f0f0"/>
        <path
                d="{create_2path(viewbox)}"
                fill="black"
        />
    </svg>''')
