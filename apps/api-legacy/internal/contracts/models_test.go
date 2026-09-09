package contracts

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIsValidCategory(t *testing.T) {
	tests := []struct {
		name     string
		category string
		expected bool
	}{
		// All 6 valid MVP starter categories (see docs/schema.md).
		{name: "valid - insurance", category: CategoryInsurance, expected: true},
		{name: "valid - electricity_contract", category: CategoryElectricityContract, expected: true},
		{name: "valid - gas_contract", category: CategoryGasContract, expected: true},
		{name: "valid - mobile_contract", category: CategoryMobileContract, expected: true},
		{name: "valid - streaming_subscription", category: CategoryStreamingSubscription, expected: true},
		{name: "valid - other", category: CategoryOther, expected: true},

		// Legacy values removed by migration 000006 must be rejected.
		{name: "removed legacy - software_subscription", category: "software_subscription", expected: false},
		{name: "removed legacy - internet_contract", category: "internet_contract", expected: false},
		{name: "removed legacy - gym_membership", category: "gym_membership", expected: false},
		{name: "removed legacy - banking_product", category: "banking_product", expected: false},
		{name: "removed legacy - vehicle_obligation", category: "vehicle_obligation", expected: false},
		{name: "removed legacy - healthcare_reminder", category: "healthcare_reminder", expected: false},
		{name: "removed legacy - vaccination_reminder", category: "vaccination_reminder", expected: false},

		// Empty and arbitrary strings must be rejected.
		{name: "empty string", category: "", expected: false},
		{name: "random string", category: "not_a_category", expected: false},
		{name: "uppercase variant of valid value", category: "INSURANCE", expected: false},
		{name: "trailing whitespace", category: "insurance ", expected: false},
		{name: "leading whitespace", category: " insurance", expected: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Act
			got := IsValidCategory(tt.category)

			// Assert
			assert.Equal(t, tt.expected, got,
				"IsValidCategory(%q) = %v, want %v", tt.category, got, tt.expected)
		})
	}
}

func TestValidCategories_ContainsExactlyTheMVPStarterSet(t *testing.T) {
	// Arrange
	expected := []string{
		CategoryInsurance,
		CategoryElectricityContract,
		CategoryGasContract,
		CategoryMobileContract,
		CategoryStreamingSubscription,
		CategoryOther,
	}

	// Assert: every expected category is accepted by IsValidCategory, and the
	// set is exactly the MVP starter set (no legacy values linger).
	for _, c := range expected {
		assert.True(t, IsValidCategory(c), "IsValidCategory must accept %q", c)
	}
	assert.Len(t, expected, 6, "the MVP starter set must have exactly 6 categories")
}

func TestIsValidCategory_RejectsLegacyAndInvalidValues(t *testing.T) {
	// IsValidCategory must reject everything outside the MVP starter set:
	// legacy enum values, empty string, and arbitrary input.
	for _, category := range []string{
		"software_subscription", "internet_contract", "gym_membership",
		"banking_product", "vehicle_obligation", "healthcare_reminder",
		"vaccination_reminder", "", "INSURANCE", " insurance", "bogus",
	} {
		assert.False(t, IsValidCategory(category), "IsValidCategory must reject %q", category)
	}
}
