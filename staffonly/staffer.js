class Staffer {
  constructor(
    name,
    preferences,
    doubleStaff,
    floater,
    email,
    phone_number,
    grad_year,
    residence,
    additional,
    snacks,
    concerns,
    suggestions
  ) {
    this.name = name;
    this.preferences = preferences;
    this.assignedShift = null;
    this.doubleStaff = doubleStaff;
    this.email = email;
    this.phone_number = phone_number;
    this.grad_year = grad_year;
    this.residence = residence;
    this.additional = additional;
    this.snacks = snacks;
    this.concerns = concerns;
    this.suggestions = suggestions;
    // Interpret the floater field as a boolean: true if "floater", false if "fullstaff"
    this.floater = floater === "floater";
    // console.log("Created Staffer:", this.name, this.preferences);
  }

  getPreferenceScore(shift) {
    // console.log("Shift Index:", shift.index);
    let preference = this.preferences[shift.index];
    // console.log(`Shift Index: ${shift.index}, Preference: ${preference}`);
    const scores = { nooo: 0, pref_no: 1, ok: 2, great: 3 };
    return scores[preference] || 0; // Default to 0 if preference not found
  }

  wantsDoubleShift() {
    return this.doubleStaff === "share";
  }

  wantsSoloShift() {
    return this.doubleStaff === "solo";
  }

  isIndifferent() {
    return this.doubleStaff === "either";
  }

  assignShift(shift) {
    this.assignedShift = shift;
  }

  isAvailableForShift(shift) {
    return this.preferences.includes(shift.index);
  }
}
