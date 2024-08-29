class Shift {
  constructor(index) {
    this.index = index;
    this.assignedStaffer = null;
    this.score = 0;
  }

  assignStaffer(staffer) {
    this.assignedStaffer = staffer;
    this.score = staffer.getPreferenceScore(this); // Set score based on staffer's preference
    staffer.assignShift(this);
  }

  isAssigned() {
    return this.assignedStaffer !== null;
  }
}
