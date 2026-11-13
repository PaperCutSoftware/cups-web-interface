package cups

import (
	"os/exec"
	"strings"
	"testing"
)

func TestCLIAdapterGetDriversReal(t *testing.T) {
	if _, err := exec.LookPath("lpinfo"); err != nil {
		t.Skip("lpinfo not installed on this system")
	}

	adapter := NewCLIAdapter()
	drivers, err := adapter.GetDrivers("kyocera")
	if err != nil {
		t.Fatalf("failed to get drivers: %v", err)
	}

	if len(drivers) == 0 {
		t.Log("No Kyocera drivers found on this system, skipping check")
		return
	}

	// Verify that driver names are NOT truncated at the first space
	for _, d := range drivers {
		if strings.HasPrefix(d.Name, "Library/Printers/") {
			if !strings.HasSuffix(d.Name, ".ppd") && !strings.HasSuffix(d.Name, ".PPD") && !strings.HasSuffix(d.Name, ".gz") {
				// If the file on disk has an extension, it shouldn't have been cut off before the extension
				t.Errorf("Driver name looks truncated: %q", d.Name)
			}
		}
	}
	t.Logf("Successfully found %d Kyocera drivers with complete names", len(drivers))
}

func TestCLIAdapterAddAndRemoveKyoceraPrinter(t *testing.T) {
	if _, err := exec.LookPath("lpadmin"); err != nil {
		t.Skip("lpadmin not installed on this system")
	}

	adapter := NewCLIAdapter()
	drivers, err := adapter.GetDrivers("kyocera")
	if err != nil || len(drivers) == 0 {
		t.Skip("Kyocera drivers not available on this machine")
	}

	selectedDriver := drivers[0].Name
	testQueue := "CUPS_webui_Kyocera_TestQueue"

	// Ensure cleanup in case of prior run
	_ = adapter.DeletePrinter(testQueue)

	params := AddPrinterParams{
		Name:        testQueue,
		URI:         "socket://192.168.1.65:9100",
		Description: "CUPS webui Kyocera Test",
		Location:    "Test Lab",
		Model:       selectedDriver,
		Shared:      false,
	}

	err = adapter.AddPrinter(params)
	if err != nil {
		t.Fatalf("AddPrinter with driver %q failed: %v", selectedDriver, err)
	}

	// Clean up after test
	err = adapter.DeletePrinter(testQueue)
	if err != nil {
		t.Fatalf("DeletePrinter failed: %v", err)
	}
}

func TestCLIAdapterSetDefaultPrinter(t *testing.T) {
	if _, err := exec.LookPath("lpadmin"); err != nil {
		t.Skip("lpadmin not installed on this system")
	}

	adapter := NewCLIAdapter()
	printers, err := adapter.GetPrinters()
	if err != nil || len(printers) == 0 {
		t.Skip("no printers installed on this system")
	}

	target := printers[0].Name
	err = adapter.SetDefaultPrinter(target)
	if err != nil {
		t.Fatalf("SetDefaultPrinter(%q) failed: %v", target, err)
	}

	status, err := adapter.GetSystemStatus()
	if err != nil {
		t.Fatalf("GetSystemStatus failed: %v", err)
	}
	if status.DefaultPrinter != target {
		t.Errorf("expected default printer %q, got %q", target, status.DefaultPrinter)
	}

	refreshedPrinters, err := adapter.GetPrinters()
	if err != nil {
		t.Fatalf("GetPrinters failed: %v", err)
	}
	var foundDefault bool
	for _, p := range refreshedPrinters {
		if p.Name == target && p.IsDefault {
			foundDefault = true
			break
		}
	}
	if !foundDefault {
		t.Errorf("expected printer %q to have IsDefault=true after SetDefaultPrinter", target)
	}
}

func TestCLIAdapterSetPrinterOptions(t *testing.T) {
	if _, err := exec.LookPath("lpadmin"); err != nil {
		t.Skip("lpadmin not installed on this system")
	}

	adapter := NewCLIAdapter()
	printers, err := adapter.GetPrinters()
	if err != nil || len(printers) == 0 {
		t.Skip("no printers installed on this system")
	}

	target := printers[0].Name
	opts, err := adapter.GetPrinterOptions(target)
	if err != nil || opts == nil || len(opts.General) == 0 {
		t.Skip("printer has no PPD options available to test")
	}

	firstOpt := opts.General[0]
	if len(firstOpt.Choices) == 0 {
		t.Skip("no choices for option")
	}

	choice := firstOpt.Choices[0].Name
	err = adapter.SetPrinterOptions(target, map[string]string{
		firstOpt.Key: choice,
	})
	if err != nil {
		t.Fatalf("SetPrinterOptions failed: %v", err)
	}
}
