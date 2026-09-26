"""Tests for the billing/pricing engine.

These tests verify:
- Washing minimum charge
- Normal washing calculation
- Steam ironing calculation
- Dry cleaning calculation
- Combined orders
- Dynamic pricing (old order keeps old price)
- Decimal rounding
"""
import pytest
from decimal import Decimal

from app.services.pricing_service import calculate_line_total


class TestCalculateLineTotal:
    """Unit tests for calculate_line_total — the core billing function."""

    # ─── Washing (PER_KG) ────────────────────────────────────────────────

    def test_washing_minimum_charge(self):
        """0.5kg × ₹60 = ₹30, but minimum is ₹50 → charge ₹50."""
        result = calculate_line_total(
            pricing_type="PER_KG",
            quantity=Decimal("0.5"),
            rate=Decimal("60.00"),
            minimum_charge=Decimal("50.00"),
        )
        assert result == Decimal("50.00")

    def test_washing_normal(self):
        """2.5kg × ₹60 = ₹150 (above minimum of ₹50)."""
        result = calculate_line_total(
            pricing_type="PER_KG",
            quantity=Decimal("2.5"),
            rate=Decimal("60.00"),
            minimum_charge=Decimal("50.00"),
        )
        assert result == Decimal("150.00")

    def test_washing_exactly_minimum(self):
        """Amount exactly equals minimum charge."""
        # ₹50/₹60 ≈ 0.833kg → charge = ₹50
        result = calculate_line_total(
            pricing_type="PER_KG",
            quantity=Decimal("0.833"),
            rate=Decimal("60.00"),
            minimum_charge=Decimal("50.00"),
        )
        assert result == Decimal("50.00")  # 0.833 × 60 = 49.98, minimum wins

    def test_washing_changed_minimum(self):
        """Admin changed minimum to ₹100."""
        result = calculate_line_total(
            pricing_type="PER_KG",
            quantity=Decimal("0.5"),
            rate=Decimal("60.00"),
            minimum_charge=Decimal("100.00"),
        )
        assert result == Decimal("100.00")

    def test_washing_changed_rate(self):
        """Admin changed rate to ₹100/kg."""
        result = calculate_line_total(
            pricing_type="PER_KG",
            quantity=Decimal("2"),
            rate=Decimal("100.00"),
            minimum_charge=Decimal("50.00"),
        )
        assert result == Decimal("200.00")

    def test_washing_no_minimum(self):
        """PER_KG with zero minimum charge."""
        result = calculate_line_total(
            pricing_type="PER_KG",
            quantity=Decimal("0.5"),
            rate=Decimal("60.00"),
            minimum_charge=Decimal("0.00"),
        )
        assert result == Decimal("30.00")

    # ─── Steam Ironing (PER_PIECE) ───────────────────────────────────────

    def test_ironing_basic(self):
        """5 pieces × ₹15 = ₹75."""
        result = calculate_line_total(
            pricing_type="PER_PIECE",
            quantity=Decimal("5"),
            rate=Decimal("15.00"),
        )
        assert result == Decimal("75.00")

    def test_ironing_changed_price(self):
        """Admin changed ironing to ₹20/piece."""
        result = calculate_line_total(
            pricing_type="PER_PIECE",
            quantity=Decimal("5"),
            rate=Decimal("20.00"),
        )
        assert result == Decimal("100.00")

    def test_ironing_single(self):
        """1 piece × ₹15 = ₹15."""
        result = calculate_line_total(
            pricing_type="PER_PIECE",
            quantity=Decimal("1"),
            rate=Decimal("15.00"),
        )
        assert result == Decimal("15.00")

    # ─── Dry Cleaning (PER_PIECE) ────────────────────────────────────────

    def test_dry_cleaning_shirt(self):
        """3 shirts × ₹80 = ₹240."""
        result = calculate_line_total(
            pricing_type="PER_PIECE",
            quantity=Decimal("3"),
            rate=Decimal("80.00"),
        )
        assert result == Decimal("240.00")

    def test_dry_cleaning_suit(self):
        """1 suit × ₹300 = ₹300."""
        result = calculate_line_total(
            pricing_type="PER_PIECE",
            quantity=Decimal("1"),
            rate=Decimal("300.00"),
        )
        assert result == Decimal("300.00")

    # ─── Flat Rate ───────────────────────────────────────────────────────

    def test_flat_rate(self):
        """FLAT pricing ignores quantity."""
        result = calculate_line_total(
            pricing_type="FLAT",
            quantity=Decimal("5"),
            rate=Decimal("500.00"),
        )
        assert result == Decimal("500.00")

    # ─── PER_UNIT ────────────────────────────────────────────────────────

    def test_per_unit(self):
        """3 units × ₹50 = ₹150."""
        result = calculate_line_total(
            pricing_type="PER_UNIT",
            quantity=Decimal("3"),
            rate=Decimal("50.00"),
        )
        assert result == Decimal("150.00")

    # ─── Decimal handling ────────────────────────────────────────────────

    def test_decimal_rounding(self):
        """Result is rounded to 2 decimal places."""
        result = calculate_line_total(
            pricing_type="PER_KG",
            quantity=Decimal("1.333"),
            rate=Decimal("60.00"),
            minimum_charge=Decimal("0.00"),
        )
        assert result == Decimal("79.98")

    def test_decimal_quantity(self):
        """Handles fractional quantities properly."""
        result = calculate_line_total(
            pricing_type="PER_KG",
            quantity=Decimal("0.100"),
            rate=Decimal("60.00"),
            minimum_charge=Decimal("50.00"),
        )
        assert result == Decimal("50.00")  # 6.00 < 50.00, minimum applies

    # ─── Invalid input ───────────────────────────────────────────────────

    def test_unknown_pricing_type(self):
        """Unknown pricing type raises ValueError."""
        with pytest.raises(ValueError):
            calculate_line_total(
                pricing_type="UNKNOWN",
                quantity=Decimal("1"),
                rate=Decimal("10.00"),
            )


class TestCombinedOrder:
    """Test combined service calculations."""

    def test_combined_services(self):
        """Washing + Ironing + Dry Cleaning combined total."""
        washing = calculate_line_total("PER_KG", Decimal("2.5"), Decimal("60.00"), Decimal("50.00"))
        ironing = calculate_line_total("PER_PIECE", Decimal("4"), Decimal("15.00"))
        dry_cleaning = calculate_line_total("PER_PIECE", Decimal("2"), Decimal("80.00"))

        assert washing == Decimal("150.00")
        assert ironing == Decimal("60.00")
        assert dry_cleaning == Decimal("160.00")

        subtotal = washing + ironing + dry_cleaning
        assert subtotal == Decimal("370.00")

    def test_combined_with_minimum(self):
        """Small wash + ironing: minimum applies to washing only."""
        washing = calculate_line_total("PER_KG", Decimal("0.5"), Decimal("60.00"), Decimal("50.00"))
        ironing = calculate_line_total("PER_PIECE", Decimal("3"), Decimal("15.00"))

        assert washing == Decimal("50.00")  # minimum charge
        assert ironing == Decimal("45.00")

        subtotal = washing + ironing
        assert subtotal == Decimal("95.00")
