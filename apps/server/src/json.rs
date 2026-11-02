// json.rs: Lightweight JSON AST, parser and serializer for Discovery Server

#[derive(Debug, Clone, PartialEq)]
pub enum JsonValue {
    Null,
    Bool(bool),
    Number(f64),
    String(String),
    Array(Vec<JsonValue>),
    Object(Vec<(String, JsonValue)>),
}

impl JsonValue {
    pub fn get(&self, key: &str) -> Option<&JsonValue> {
        match self {
            JsonValue::Object(entries) => entries.iter().find(|(k, _)| k == key).map(|(_, v)| v),
            _ => None,
        }
    }

    pub fn get_str(&self, key: &str) -> Option<&str> {
        match self.get(key) {
            Some(JsonValue::String(s)) => Some(s.as_str()),
            _ => None,
        }
    }

    pub fn get_f64(&self, key: &str) -> Option<f64> {
        match self.get(key) {
            Some(JsonValue::Number(n)) => Some(*n),
            _ => None,
        }
    }

    pub fn get_i64(&self, key: &str) -> Option<i64> {
        match self.get(key) {
            Some(JsonValue::Number(n)) => Some(*n as i64),
            _ => None,
        }
    }

    pub fn get_bool(&self, key: &str) -> Option<bool> {
        match self.get(key) {
            Some(JsonValue::Bool(b)) => Some(*b),
            _ => None,
        }
    }

    pub fn as_str(&self) -> Option<&str> {
        match self {
            JsonValue::String(s) => Some(s.as_str()),
            _ => None,
        }
    }

    pub fn as_array(&self) -> Option<&[JsonValue]> {
        match self {
            JsonValue::Array(arr) => Some(arr.as_slice()),
            _ => None,
        }
    }
}
impl JsonValue {
    pub fn to_string(&self) -> String {
        let mut out = String::new();
        self.write_buf(&mut out);
        out
    }

    fn write_buf(&self, out: &mut String) {
        match self {
            JsonValue::Null => out.push_str("null"),
            JsonValue::Bool(true) => out.push_str("true"),
            JsonValue::Bool(false) => out.push_str("false"),
            JsonValue::Number(n) => {
                if n.is_nan() || n.is_infinite() {
                    out.push_str("null");
                } else if n.fract() == 0.0 {
                    out.push_str(&format!("{:.0}", n));
                } else {
                    out.push_str(&format!("{}", n));
                }
            }
            JsonValue::String(s) => {
                out.push('"');
                for c in s.chars() {
                    match c {
                        '"' => out.push_str("\\\""),
                        '\\' => out.push_str("\\\\"),
                        '\n' => out.push_str("\\n"),
                        '\r' => out.push_str("\\r"),
                        '\t' => out.push_str("\\t"),
                        '\u{08}' => out.push_str("\\b"),
                        '\u{0c}' => out.push_str("\\f"),
                        c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
                        c => out.push(c),
                    }
                }
                out.push('"');
            }
            JsonValue::Array(items) => {
                out.push('[');
                for (i, item) in items.iter().enumerate() {
                    if i > 0 {
                        out.push(',');
                    }
                    item.write_buf(out);
                }
                out.push(']');
            }
            JsonValue::Object(entries) => {
                out.push('{');
                for (i, (k, v)) in entries.iter().enumerate() {
                    if i > 0 {
                        out.push(',');
                    }
                    JsonValue::String(k.clone()).write_buf(out);
                    out.push(':');
                    v.write_buf(out);
                }
                out.push('}');
            }
        }
    }
}
pub fn parse_json(input: &str) -> Result<JsonValue, String> {
    let mut chars = input.chars().peekable();
    skip_whitespace(&mut chars);
    let val = parse_value(&mut chars)?;
    skip_whitespace(&mut chars);
    if chars.peek().is_some() {
        return Err("Unexpected trailing characters".to_string());
    }
    Ok(val)
}

fn skip_whitespace<I: Iterator<Item = char>>(chars: &mut std::iter::Peekable<I>) {
    while let Some(&c) = chars.peek() {
        if c == ' ' || c == '\t' || c == '\n' || c == '\r' {
            chars.next();
        } else {
            break;
        }
    }
}

fn parse_value<I: Iterator<Item = char>>(chars: &mut std::iter::Peekable<I>) -> Result<JsonValue, String> {
    skip_whitespace(chars);
    match chars.peek() {
        Some('{') => parse_object(chars),
        Some('[') => parse_array(chars),
        Some('"') => parse_string(chars).map(JsonValue::String),
        Some('t') | Some('f') => parse_bool(chars),
        Some('n') => parse_null(chars),
        Some(&c) if c == '-' || c.is_ascii_digit() => parse_number(chars),
        Some(other) => Err(format!("Unexpected character: {}", other)),
        None => Err("Unexpected end of JSON input".to_string()),
    }
}

fn parse_null<I: Iterator<Item = char>>(chars: &mut std::iter::Peekable<I>) -> Result<JsonValue, String> {
    let s: String = chars.by_ref().take(4).collect();
    if s == "null" {
        Ok(JsonValue::Null)
    } else {
        Err(format!("Expected null, got: {}", s))
    }
}

fn parse_bool<I: Iterator<Item = char>>(chars: &mut std::iter::Peekable<I>) -> Result<JsonValue, String> {
    if chars.peek() == Some(&'t') {
        let s: String = chars.by_ref().take(4).collect();
        if s == "true" { Ok(JsonValue::Bool(true)) } else { Err("Invalid bool".to_string()) }
    } else {
        let s: String = chars.by_ref().take(5).collect();
        if s == "false" { Ok(JsonValue::Bool(false)) } else { Err("Invalid bool".to_string()) }
    }
}
fn parse_string<I: Iterator<Item = char>>(chars: &mut std::iter::Peekable<I>) -> Result<String, String> {
    if chars.next() != Some('"') {
        return Err("Expected '\"'".to_string());
    }
    let mut out = String::new();
    while let Some(c) = chars.next() {
        match c {
            '"' => return Ok(out),
            '\\' => {
                let escaped = match chars.next() {
                    Some('"') => '"',
                    Some('\\') => '\\',
                    Some('/') => '/',
                    Some('b') => '\u{08}',
                    Some('f') => '\u{0c}',
                    Some('n') => '\n',
                    Some('r') => '\r',
                    Some('t') => '\t',
                    Some('u') => {
                        let hex: String = chars.by_ref().take(4).collect();
                        if hex.len() != 4 {
                            return Err("Invalid unicode escape".to_string());
                        }
                        let code = u32::from_str_radix(&hex, 16).map_err(|e| e.to_string())?;
                        char::from_u32(code).unwrap_or('\u{fffd}')
                    }
                    Some(other) => other,
                    None => return Err("Unterminated escape sequence".to_string()),
                };
                out.push(escaped);
            }
            other => out.push(other),
        }
    }
    Err("Unterminated string".to_string())
}

fn parse_number<I: Iterator<Item = char>>(chars: &mut std::iter::Peekable<I>) -> Result<JsonValue, String> {
    let mut num_str = String::new();
    while let Some(&c) = chars.peek() {
        if c == '-' || c == '+' || c == '.' || c == 'e' || c == 'E' || c.is_ascii_digit() {
            num_str.push(c);
            chars.next();
        } else {
            break;
        }
    }
    let val: f64 = num_str.parse().map_err(|e: std::num::ParseFloatError| e.to_string())?;
    Ok(JsonValue::Number(val))
}
fn parse_array<I: Iterator<Item = char>>(chars: &mut std::iter::Peekable<I>) -> Result<JsonValue, String> {
    chars.next(); // consume '['
    skip_whitespace(chars);
    if chars.peek() == Some(&']') {
        chars.next();
        return Ok(JsonValue::Array(Vec::new()));
    }
    let mut items = Vec::new();
    loop {
        let val = parse_value(chars)?;
        items.push(val);
        skip_whitespace(chars);
        match chars.peek() {
            Some(',') => {
                chars.next();
                skip_whitespace(chars);
            }
            Some(']') => {
                chars.next();
                break;
            }
            Some(c) => return Err(format!("Expected ',' or ']', found: {}", c)),
            None => return Err("Unterminated array".to_string()),
        }
    }
    Ok(JsonValue::Array(items))
}

fn parse_object<I: Iterator<Item = char>>(chars: &mut std::iter::Peekable<I>) -> Result<JsonValue, String> {
    chars.next(); // consume '{'
    skip_whitespace(chars);
    if chars.peek() == Some(&'}') {
        chars.next();
        return Ok(JsonValue::Object(Vec::new()));
    }
    let mut entries = Vec::new();
    loop {
        skip_whitespace(chars);
        let key = parse_string(chars)?;
        skip_whitespace(chars);
        if chars.next() != Some(':') {
            return Err("Expected ':' after key in object".to_string());
        }
        let val = parse_value(chars)?;
        entries.push((key, val));
        skip_whitespace(chars);
        match chars.peek() {
            Some(',') => {
                chars.next();
                skip_whitespace(chars);
            }
            Some('}') => {
                chars.next();
                break;
            }
            Some(c) => return Err(format!("Expected ',' or '}}', found: {}", c)),
            None => return Err("Unterminated object".to_string()),
        }
    }
    Ok(JsonValue::Object(entries))
}
