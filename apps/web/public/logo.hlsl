vec2 project(vec2 a, vec2 b) {
    return a * dot(a, b) / dot(a, a);
}

vec4 drawCircle(vec2 coord, vec2 c, float r, float rr, float as, float ae, vec3 color1, vec3 color2) {
    vec2 delta = coord - c;

    float d = length(delta);
    if (d < r - 15.0) {
        return vec4(0, 0, 0, 0);
    }

    float a = atan(delta.y, delta.x) + 3.14;
    if (as < ae ? a > as && a < ae : a > as || a < ae) {
        if (d < r) {
            return vec4(0, 0, 0, 1);
        } else if (d < rr) {
            float crossLength = sqrt(pow(rr, 2.0) * 2.0);
            float p = length(project(vec2(-1,1),delta)-(vec2(-1,1)*crossLength)) / (crossLength * 2.0);
            return vec4(mix(color1, color2, p), 1);
        } else if (d < rr + 15.0) {
            return vec4(0, 0, 0, 1);
        }
    }

    return vec4(0, 0, 0, 0);
}

vec3 parseColor(int color) {
    return vec3(float((color >> 16) & 0xff) / 255.0, float((color >> 8) & 0xff) / 255.0, float((color >> 0) & 0xff) / 255.0);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 c1 = vec2(0.6, 0.5) * iResolution.xy;
    float r1 = 0.3 * iResolution.y;
    float rr1 = 0.2 * iResolution.y;
    float as1 = 225.0 / 180.0 * 3.14;
    float ae1 = 135.0 / 180.0 * 3.14;
    vec2 c2 = vec2(0.45, 0.5) * iResolution.xy;
    float r2 = 0.3 * iResolution.y;
    float rr2 = 0.2 * iResolution.y;
    float as2 = 315.0 / 180.0 * 3.14;
    float ae2 = 270.0 / 180.0 * 3.14;
    float w = 11.0;
    vec3 color11= parseColor(0xD9D9D9);
    vec3 color12= parseColor(0x898989);
    vec3 color21 = parseColor(0x2D6AF6);
    vec3 color22 = parseColor(0xA3BFFF);

    vec4 color;
    if (fragCoord.y < iResolution.y / 2.0) {
        color = drawCircle(fragCoord, c1, rr1, r1, as1, ae1, color11, color12);
        if (color.a == 0.0) {
            color = drawCircle(fragCoord, c2, rr2, r2, as2, ae2, color21, color22);
        }
    } else {
        color = drawCircle(fragCoord, c2, rr2, r2, as2, ae2, color21, color22);
        if (color.a == 0.0) {
            color = drawCircle(fragCoord, c1, rr1, r1, as1, ae1, color11, color12);
        }
    }
    fragColor = color;
}
