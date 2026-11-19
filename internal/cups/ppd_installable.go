package cups

import (
	"bytes"
	"strings"
)

// maxPPDSize caps how much of a PPD is parsed. Real PPDs are well under 2 MB.
const maxPPDSize = 16 << 20

// PPDInstallableOption is one option from a PPD's InstallableOptions group.
type PPDInstallableOption struct {
	Key     string         // e.g. "OptStapler"
	Label   string         // text after "/" in *OpenUI, e.g. "Staple"
	UIType  string         // "Boolean", "PickOne" or "PickMany"
	Default string         // value of *Default<Key>
	Choices []OptionChoice // choices in PPD order
}

// PPDSummary holds what the accessory feature needs from a PPD.
type PPDSummary struct {
	NickName     string
	ModelName    string
	Manufacturer string
	PCFileName   string
	// HasInstallableGroup is true when the PPD declares *OpenGroup: InstallableOptions.
	HasInstallableGroup bool
	// Driverless is true for PPDs that macOS or CUPS generated for an
	// AirPrint / IPP Everywhere queue.
	Driverless  bool
	Installable []PPDInstallableOption
}

// DriverNames returns the names CUPS may list this driver under (lpinfo
// make-and-model). CUPS prefixes the manufacturer when the NickName doesn't
// start with it, e.g. Kyocera's "CS 7003i KPDL" is "Kyocera CS 7003i KPDL".
func (s *PPDSummary) DriverNames() []string {
	var names []string
	add := func(n string) {
		n = strings.TrimSpace(n)
		if n == "" {
			return
		}
		for _, existing := range names {
			if existing == n {
				return
			}
		}
		names = append(names, n)
	}
	add(s.NickName)
	if s.Manufacturer != "" && !strings.HasPrefix(strings.ToLower(s.NickName), strings.ToLower(s.Manufacturer)) {
		add(s.Manufacturer + " " + s.NickName)
	}
	add(s.ModelName)
	return names
}

// Option returns the installable option with the given key, or nil.
func (s *PPDSummary) Option(key string) *PPDInstallableOption {
	for i := range s.Installable {
		if s.Installable[i].Key == key {
			return &s.Installable[i]
		}
	}
	return nil
}

// ParsePPDSummary reads a PPD and returns its InstallableOptions group and the
// fields used to identify the driver. It accepts LF, CRLF and CR line endings
// and skips multi-line quoted values (PostScript code), so a line inside such
// a value is never mistaken for a keyword.
func ParsePPDSummary(data []byte) *PPDSummary {
	if len(data) > maxPPDSize {
		data = data[:maxPPDSize]
	}
	data = bytes.ReplaceAll(data, []byte("\r\n"), []byte("\n"))
	data = bytes.ReplaceAll(data, []byte("\r"), []byte("\n"))

	s := &PPDSummary{}
	inGroup := false
	var current *PPDInstallableOption
	inQuoted := false
	defaults := map[string]string{}

	for _, raw := range strings.Split(string(data), "\n") {
		if inQuoted {
			// A multi-line quoted value ends on the line holding the closing quote.
			if strings.Contains(raw, "\"") {
				inQuoted = false
			}
			continue
		}
		line := strings.TrimSpace(raw)
		if !strings.HasPrefix(line, "*") {
			continue
		}
		if strings.HasPrefix(line, "*%") {
			if strings.Contains(line, "PPD created by ipp2ppd") {
				s.Driverless = true
			}
			continue
		}

		keyword, value, hasValue := splitPPDLine(line)
		if hasValue && strings.HasPrefix(value, "\"") && strings.Count(value, "\"")%2 == 1 {
			inQuoted = true
		}

		mainKey, option := keyword, ""
		if sp := strings.IndexAny(keyword, " \t"); sp != -1 {
			mainKey = keyword[:sp]
			option = strings.TrimSpace(keyword[sp+1:])
		}
		unquoted := strings.Trim(value, "\"")

		switch mainKey {
		case "*NickName":
			s.NickName = unquoted
			continue
		case "*ModelName":
			s.ModelName = unquoted
			continue
		case "*Manufacturer":
			s.Manufacturer = unquoted
			continue
		case "*PCFileName":
			s.PCFileName = unquoted
			continue
		case "*APAirPrint":
			if strings.EqualFold(unquoted, "True") {
				s.Driverless = true
			}
			continue
		case "*OpenGroup":
			name, _, _ := strings.Cut(value, "/")
			if strings.TrimSpace(name) == "InstallableOptions" {
				inGroup = true
				s.HasInstallableGroup = true
			}
			continue
		case "*CloseGroup":
			name, _, _ := strings.Cut(value, "/")
			if strings.TrimSpace(name) == "InstallableOptions" {
				inGroup = false
				current = nil
			}
			continue
		case "*OpenUI", "*JCLOpenUI":
			if !inGroup || option == "" {
				continue
			}
			key, label, _ := strings.Cut(strings.TrimPrefix(option, "*"), "/")
			key = strings.TrimSpace(key)
			if key == "" {
				continue
			}
			label = decodePPDText(strings.TrimSpace(label))
			if label == "" {
				label = key
			}
			s.Installable = append(s.Installable, PPDInstallableOption{
				Key:    key,
				Label:  label,
				UIType: strings.TrimSpace(value),
			})
			current = &s.Installable[len(s.Installable)-1]
			continue
		case "*CloseUI", "*JCLCloseUI":
			current = nil
			continue
		}

		// *DefaultOptStapler: True (may appear outside the OpenUI block)
		if strings.HasPrefix(mainKey, "*Default") && option == "" && hasValue {
			defaults[strings.TrimPrefix(mainKey, "*Default")] = strings.TrimSpace(unquoted)
			continue
		}

		// *OptStapler True/Installed: ""
		if current != nil && option != "" && mainKey == "*"+current.Key {
			name, label, _ := strings.Cut(option, "/")
			name = strings.TrimSpace(name)
			label = decodePPDText(strings.TrimSpace(label))
			if label == "" {
				label = name
			}
			current.Choices = append(current.Choices, OptionChoice{Name: name, Label: label})
		}
	}

	if strings.EqualFold(s.PCFileName, "ippeve.ppd") ||
		strings.Contains(strings.ToLower(s.NickName), "ipp everywhere") {
		s.Driverless = true
	}

	for i := range s.Installable {
		opt := &s.Installable[i]
		opt.Default = defaults[opt.Key]
		for j := range opt.Choices {
			opt.Choices[j].IsDefault = opt.Choices[j].Name == opt.Default
		}
	}
	return s
}

// splitPPDLine splits "*Keyword option/label: value" at the first colon that
// is not inside the option part. It returns the part before the colon and the
// trimmed value.
func splitPPDLine(line string) (keyword, value string, ok bool) {
	idx := strings.Index(line, ":")
	if idx == -1 {
		return line, "", false
	}
	return strings.TrimSpace(line[:idx]), strings.TrimSpace(line[idx+1:]), true
}

// decodePPDText decodes hexadecimal substrings in a PPD translation string,
// e.g. "2<2F>4 Holes" is "2/4 Holes". Malformed sequences are kept as they are.
func decodePPDText(s string) string {
	if !strings.Contains(s, "<") {
		return s
	}
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		if s[i] == '<' {
			if end := strings.IndexByte(s[i+1:], '>'); end != -1 {
				if decoded, ok := decodeHex(s[i+1 : i+1+end]); ok {
					b.WriteString(decoded)
					i += end + 1
					continue
				}
			}
		}
		b.WriteByte(s[i])
	}
	return b.String()
}

func decodeHex(h string) (string, bool) {
	h = strings.Join(strings.Fields(h), "")
	if h == "" || len(h)%2 != 0 {
		return "", false
	}
	out := make([]byte, len(h)/2)
	for i := 0; i < len(out); i++ {
		hi, ok1 := hexVal(h[2*i])
		lo, ok2 := hexVal(h[2*i+1])
		if !ok1 || !ok2 {
			return "", false
		}
		out[i] = hi<<4 | lo
	}
	return string(out), true
}

func hexVal(c byte) (byte, bool) {
	switch {
	case c >= '0' && c <= '9':
		return c - '0', true
	case c >= 'a' && c <= 'f':
		return c - 'a' + 10, true
	case c >= 'A' && c <= 'F':
		return c - 'A' + 10, true
	}
	return 0, false
}
