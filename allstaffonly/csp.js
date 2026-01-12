// Robust CSP class for complete shift scheduling
class CSP {
  constructor(staffers, shifts, settings) {
    this.shifts = shifts;
    this.allStaffers = staffers;
    this.staffers = staffers.filter((staffer) => !staffer.floater);
    this.floaters = staffers.filter((staffer) => staffer.floater);
    this.threshold = settings;
    this.numStaffers = this.staffers.length;
    this.numShifts = this.shifts.length;

    this.bestSolution = null;
    this.bestScore = -Infinity;
    this.backtrackCallCount = 0;
    this.MAX_CALLS = 100000;
    this.problemShifts = new Set();
    this.solutionFound = false;

    this.domains = this.assignDomains();
    this.feasibilityReport = this.analyzeFeasibility();

    console.log("CSP initialized:", {
      staffers: this.numStaffers,
      floaters: this.floaters.length,
      shifts: this.numShifts,
      threshold: this.threshold,
      feasible: this.feasibilityReport.feasible,
      problemShifts: this.problemShifts.size,
    });
  }

  assignDomains() {
    let domains = {};
    for (let shift of this.shifts) {
      domains[shift.index] = this.staffers.filter((staffer) => {
        let score = staffer.getPreferenceScore(shift);
        // Respect the threshold setting:
        // threshold 0 = "Okay" = accept pref_no(1), ok(2), great(3)
        // threshold 1 = "Great" = accept ok(2), great(3)
        // threshold 2 = "Ideal" = accept only great(3)
        return score > this.threshold;
      });

      if (domains[shift.index].length === 0) {
        this.problemShifts.add(shift.index);
        console.log(
          `Problem shift ${shift.index}: No regular staffers available with threshold ${this.threshold}`
        );
      }
    }

    console.log(
      `Domain analysis with threshold ${this.threshold}: ${this.problemShifts.size} problem shifts detected`
    );
    return domains;
  }

  analyzeFeasibility() {
    const report = {
      totalStaffers: this.numStaffers,
      floaters: this.floaters.length,
      totalShifts: this.numShifts,
      problemShifts: Array.from(this.problemShifts),
      minStaffersNeeded: this.numShifts,
      maxPositionsAvailable: this.numStaffers,
      feasible: true,
      issues: [],
    };

    if (report.totalStaffers < report.minStaffersNeeded) {
      report.feasible = false;
      report.issues.push(
        `Cannot create schedule: need at least ${report.minStaffersNeeded} regular staffers, but only have ${report.totalStaffers}`
      );
    }

    if (this.problemShifts.size > 0) {
      report.feasible = false;
      report.issues.push(
        `${this.problemShifts.size} shifts have no available regular staffers`
      );
    }

    // Advanced feasibility check using maximum bipartite matching
    if (report.feasible) {
      const matchingResult = this.checkMaximumMatching();
      if (matchingResult.maxMatching < this.numShifts) {
        report.feasible = false;
        report.issues.push(
          `Maximum possible assignment is ${matchingResult.maxMatching}/${this.numShifts} shifts`
        );
        report.issues.push(
          `Problematic shifts: ${matchingResult.unassignableShifts.join(", ")}`
        );
      }
    }

    return report;
  }

  checkMaximumMatching() {
    console.log(
      `Performing maximum bipartite matching analysis with threshold ${this.threshold}...`
    );

    const graph = {};
    for (const staffer of this.staffers) {
      graph[staffer.name] = [];
      for (const shift of this.shifts) {
        const score = staffer.getPreferenceScore(shift);
        if (score > this.threshold) {
          graph[staffer.name].push(shift.index);
        }
      }
    }

    const matching = {};
    const reverseMatching = {};

    for (const staffer of this.staffers) {
      this.findAugmentingPath(
        staffer.name,
        graph,
        matching,
        reverseMatching,
        new Set()
      );
    }

    const maxMatching = Object.keys(matching).length;
    const assignedShifts = new Set(Object.values(matching));
    const unassignableShifts = this.shifts
      .map((s) => s.index)
      .filter((shiftIndex) => !assignedShifts.has(shiftIndex));

    console.log(
      `Maximum bipartite matching with threshold ${this.threshold}: ${maxMatching}/${this.numShifts}`
    );
    if (unassignableShifts.length > 0) {
      console.log(`Unassignable shifts: ${unassignableShifts}`);
    }

    return {
      maxMatching,
      unassignableShifts,
      matching,
    };
  }

  findAugmentingPath(staffer, graph, matching, reverseMatching, visited) {
    if (visited.has(staffer)) return false;
    visited.add(staffer);

    for (const shiftIndex of graph[staffer]) {
      if (!(shiftIndex in reverseMatching)) {
        matching[staffer] = shiftIndex;
        reverseMatching[shiftIndex] = staffer;
        return true;
      }

      const matchedStaffer = reverseMatching[shiftIndex];
      if (
        this.findAugmentingPath(
          matchedStaffer,
          graph,
          matching,
          reverseMatching,
          visited
        )
      ) {
        matching[staffer] = shiftIndex;
        reverseMatching[shiftIndex] = staffer;
        return true;
      }
    }

    return false;
  }

  solve() {
    console.log(
      "Starting solve with feasibility report:",
      this.feasibilityReport
    );

    if (this.numStaffers < this.numShifts) {
      console.log("CANNOT CREATE SCHEDULE: Insufficient regular staffers");
      return null;
    }

    if (this.problemShifts.size > 0) {
      console.log("CANNOT CREATE SCHEDULE: Problem shifts detected");
      console.log(`Problem shifts: ${Array.from(this.problemShifts)}`);
      return null;
    }

    if (!this.feasibilityReport.feasible) {
      console.log(
        "CANNOT CREATE SCHEDULE: Mathematical infeasibility detected with current threshold"
      );
      console.log(
        `Current threshold ${this.threshold} is too restrictive for the available staff preferences`
      );
      return null;
    }

    // Try to solve with the EXACT threshold the user selected - no automatic relaxation
    console.log(
      `Attempting to solve with user-selected threshold: ${this.threshold}`
    );
    const solution = this.tryAllStrategies();

    if (solution && Object.keys(solution).length === this.numShifts) {
      console.log("Complete solution found with user-selected threshold!");
      this.bestSolution = solution;
      this.logSolutionSummary();
      return this.bestSolution;
    }

    console.log("=== NO COMPLETE SOLUTION FOUND WITH SELECTED THRESHOLD ===");
    console.log(
      "The selected quality setting is too restrictive for the staff preferences"
    );
    console.log(
      "Suggestion: Try a lower quality setting (e.g., 'Okay' instead of 'Great')"
    );
    this.logSolutionSummary();
    return this.bestSolution;
  }

  solveWithRelaxedThreshold() {
    const originalThreshold = this.threshold;

    for (
      let relaxedThreshold = this.threshold - 1;
      relaxedThreshold >= 0;
      relaxedThreshold--
    ) {
      console.log(`Attempting with relaxed threshold: ${relaxedThreshold}`);

      this.threshold = relaxedThreshold;
      this.domains = this.assignDomains();
      this.feasibilityReport = this.analyzeFeasibility();
      this.problemShifts = new Set();

      if (this.feasibilityReport.feasible) {
        console.log(
          `Feasible solution found with threshold ${relaxedThreshold}`
        );

        const solution = this.tryAllStrategies();
        if (solution && Object.keys(solution).length === this.numShifts) {
          console.log(
            `Complete solution found with relaxed threshold ${relaxedThreshold}!`
          );
          this.bestSolution = solution;

          this.logThresholdRelaxation(originalThreshold, relaxedThreshold);
          this.logSolutionSummary();
          return this.bestSolution;
        }
      }
    }

    this.threshold = originalThreshold;
    this.domains = this.assignDomains();
    console.log("No solution found even with maximum threshold relaxation");
    return null;
  }

  tryAllStrategies() {
    this.backtrackCallCount = 0;
    this.bestSolution = null;
    this.bestScore = -Infinity;

    const backtrackSolution = this.advancedBacktrackSearch();
    if (
      backtrackSolution &&
      Object.keys(backtrackSolution).length === this.numShifts
    ) {
      return backtrackSolution;
    }

    const propagationSolution = this.constraintPropagationSearch();
    if (
      propagationSolution &&
      Object.keys(propagationSolution).length === this.numShifts
    ) {
      return propagationSolution;
    }

    const enhancedGreedySolution = this.enhancedGreedySearch();
    if (
      enhancedGreedySolution &&
      Object.keys(enhancedGreedySolution).length === this.numShifts
    ) {
      return enhancedGreedySolution;
    }

    return null;
  }

  logThresholdRelaxation(originalThreshold, usedThreshold) {
    const thresholdNames = {
      0: "Okay (accept pref_no, ok, great)",
      1: "Great (accept ok, great)",
      2: "Ideal (accept only great)",
    };

    console.log("=== THRESHOLD RELAXATION APPLIED ===");
    console.log(`Original setting: ${thresholdNames[originalThreshold]}`);
    console.log(`Solution found with: ${thresholdNames[usedThreshold]}`);

    if (originalThreshold > usedThreshold) {
      console.log(
        "NOTE: Some staff were assigned to shifts they marked as less preferred"
      );

      // Identify staffers who got assigned to lower-preference shifts
      const compromisedAssignments =
        this.identifyCompromisedAssignments(originalThreshold);

      if (compromisedAssignments.length > 0) {
        console.log("=== STAFFERS ASSIGNED TO LESS-PREFERRED SHIFTS ===");
        compromisedAssignments.forEach((assignment) => {
          console.log(
            `${assignment.stafferName}: assigned to shift ${assignment.shiftIndex} (marked as "${assignment.preference}")`
          );
        });

        // Store this information for the UI
        this.compromisedAssignments = compromisedAssignments;
        this.thresholdRelaxed = true;
        this.originalThreshold = originalThreshold;
        this.usedThreshold = usedThreshold;
      }

      console.log(
        "Consider reviewing assignments and asking staff about flexibility"
      );
    }
  }

  identifyCompromisedAssignments(originalThreshold) {
    const compromised = [];

    if (!this.bestSolution) return compromised;

    for (const [shiftIndex, staffers] of Object.entries(this.bestSolution)) {
      for (const staffer of staffers) {
        const score = staffer.getPreferenceScore({
          index: parseInt(shiftIndex),
        });

        // If the score would not have met the original threshold
        if (score <= originalThreshold) {
          const preferenceNames = {
            0: "nooo",
            1: "pref_no",
            2: "ok",
            3: "great",
          };
          compromised.push({
            stafferName: staffer.name,
            shiftIndex: parseInt(shiftIndex),
            preference: preferenceNames[score],
            score: score,
          });
        }
      }
    }

    return compromised;
  }

  advancedBacktrackSearch() {
    console.log(
      "Starting advanced backtracking with constraint propagation..."
    );
    const assignment = {};
    this.backtrackCallCount = 0;

    const consistentDomains = this.enforceArcConsistency();

    try {
      if (this.advancedBacktrack(assignment, consistentDomains)) {
        return assignment;
      }
    } catch (e) {
      console.log(`Advanced backtrack terminated: ${e.message}`);
    }

    return null;
  }

  enforceArcConsistency() {
    console.log("Enforcing arc consistency...");
    const domains = JSON.parse(JSON.stringify(this.domains));

    let changed = true;
    let iterations = 0;

    while (changed && iterations < 10) {
      changed = false;
      iterations++;

      for (const shift of this.shifts) {
        const currentDomain = domains[shift.index];
        if (currentDomain.length === 1) {
          const requiredStaffer = currentDomain[0];

          for (const otherShift of this.shifts) {
            if (otherShift.index !== shift.index) {
              const originalLength = domains[otherShift.index].length;
              domains[otherShift.index] = domains[otherShift.index].filter(
                (s) => s.name !== requiredStaffer.name
              );
              if (domains[otherShift.index].length < originalLength) {
                changed = true;
              }
            }
          }
        }
      }
    }

    console.log(`Arc consistency enforced in ${iterations} iterations`);
    return domains;
  }

  advancedBacktrack(assignment, domains) {
    this.backtrackCallCount++;

    if (this.backtrackCallCount >= this.MAX_CALLS) {
      throw new Error("Maximum calls reached");
    }

    if (this.backtrackCallCount % 5000 === 0) {
      console.log(
        `Advanced search: ${this.backtrackCallCount} calls, ${
          Object.keys(assignment).length
        }/${this.numShifts} shifts`
      );
    }

    if (Object.keys(assignment).length === this.numShifts) {
      return true;
    }

    const nextShift = this.selectMostConstrainedShift(assignment, domains);
    if (!nextShift) return false;

    const availableStaffers = this.getAvailableStaffersAdvanced(
      nextShift,
      assignment,
      domains
    );

    for (const staffer of availableStaffers) {
      assignment[nextShift.index] = [staffer];

      const newDomains = this.propagateConstraints(
        assignment,
        domains,
        staffer,
        nextShift
      );

      if (this.isConsistentState(newDomains)) {
        if (this.advancedBacktrack(assignment, newDomains)) {
          return true;
        }
      }

      delete assignment[nextShift.index];
    }

    return false;
  }

  selectMostConstrainedShift(assignment, domains) {
    let bestShift = null;
    let minDomainSize = Infinity;

    for (const shift of this.shifts) {
      if (assignment[shift.index]) continue;

      const domainSize = domains[shift.index].filter(
        (staffer) => !this.isStafferUsed(staffer, assignment)
      ).length;

      if (domainSize < minDomainSize) {
        minDomainSize = domainSize;
        bestShift = shift;
      }
    }

    return bestShift;
  }

  getAvailableStaffersAdvanced(shift, assignment, domains) {
    return domains[shift.index]
      .filter((staffer) => !this.isStafferUsed(staffer, assignment))
      .sort((a, b) => {
        const scoreA = a.getPreferenceScore(shift);
        const scoreB = b.getPreferenceScore(shift);
        if (scoreA !== scoreB) return scoreB - scoreA;

        const constraintA = this.countConstraints(a, assignment, domains);
        const constraintB = this.countConstraints(b, assignment, domains);
        return constraintA - constraintB;
      });
  }

  propagateConstraints(assignment, domains, assignedStaffer, assignedShift) {
    const newDomains = JSON.parse(JSON.stringify(domains));

    for (const shift of this.shifts) {
      if (shift.index !== assignedShift.index) {
        newDomains[shift.index] = newDomains[shift.index].filter(
          (s) => s.name !== assignedStaffer.name
        );
      }
    }

    return newDomains;
  }

  isConsistentState(domains) {
    for (const shift of this.shifts) {
      if (domains[shift.index].length === 0) {
        return false;
      }
    }
    return true;
  }

  constraintPropagationSearch() {
    console.log("Starting constraint propagation search...");

    const matchingResult = this.checkMaximumMatching();
    const assignment = {};

    for (const [stafferName, shiftIndex] of Object.entries(
      matchingResult.matching
    )) {
      const staffer = this.staffers.find((s) => s.name === stafferName);
      assignment[shiftIndex] = [staffer];
    }

    console.log(
      `Constraint propagation filled ${Object.keys(assignment).length}/${
        this.numShifts
      } shifts`
    );
    return assignment;
  }

  enhancedGreedySearch() {
    console.log("Starting enhanced greedy search with backtracking...");

    const assignment = {};
    const usedStaffers = new Set();

    for (let strategy = 0; strategy < 3; strategy++) {
      Object.keys(assignment).forEach((key) => delete assignment[key]);
      usedStaffers.clear();

      let shifts = [...this.shifts];

      switch (strategy) {
        case 0:
          shifts.sort(
            (a, b) =>
              this.domains[a.index].length - this.domains[b.index].length
          );
          break;
        case 1:
          shifts.sort((a, b) => {
            const avgScoreA = this.getAverageScore(a);
            const avgScoreB = this.getAverageScore(b);
            return avgScoreB - avgScoreA;
          });
          break;
        case 2:
          shifts = this.shuffleArray([...this.shifts]);
          break;
      }

      console.log(`Enhanced greedy strategy ${strategy + 1}...`);

      for (const shift of shifts) {
        const availableStaffers = this.domains[shift.index]
          .filter((staffer) => !usedStaffers.has(staffer.name))
          .sort(
            (a, b) => b.getPreferenceScore(shift) - a.getPreferenceScore(shift)
          );

        if (availableStaffers.length > 0) {
          const bestStaffer = availableStaffers[0];
          assignment[shift.index] = [bestStaffer];
          usedStaffers.add(bestStaffer.name);
        }
      }

      const filledShifts = Object.keys(assignment).length;
      console.log(
        `Strategy ${strategy + 1} filled ${filledShifts}/${
          this.numShifts
        } shifts`
      );

      if (filledShifts === this.numShifts) {
        return assignment;
      }
    }

    return assignment;
  }

  getAverageScore(shift) {
    const scores = this.domains[shift.index].map((staffer) =>
      staffer.getPreferenceScore(shift)
    );
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  isStafferUsed(staffer, assignment) {
    for (const shiftIndex in assignment) {
      if (assignment[shiftIndex].some((s) => s.name === staffer.name)) {
        return true;
      }
    }
    return false;
  }

  countConstraints(staffer, assignment, domains) {
    let count = 0;
    for (const shift of this.shifts) {
      if (!assignment[shift.index] && domains[shift.index].includes(staffer)) {
        count++;
      }
    }
    return count;
  }

  calculateScore(assignment) {
    let totalScore = 0;
    let assignedStafferCount = new Set();

    for (const shiftIndex in assignment) {
      const assignedStaffers = assignment[shiftIndex];

      for (const staffer of assignedStaffers) {
        assignedStafferCount.add(staffer.name);
        const shift = this.shifts.find((s) => s.index == shiftIndex);
        const preferenceScore = staffer.getPreferenceScore(shift);
        totalScore += preferenceScore;
      }
    }

    totalScore += assignedStafferCount.size * 2;
    const unfilledShifts = this.numShifts - Object.keys(assignment).length;
    totalScore -= unfilledShifts * 1000;

    return totalScore;
  }

  logSolutionSummary() {
    if (this.bestSolution) {
      const assignedStaffers = new Set();
      let totalPositions = 0;
      let unfilledShifts = 0;

      for (const shift of this.shifts) {
        if (this.bestSolution[shift.index]) {
          const staffers = this.bestSolution[shift.index];
          totalPositions += staffers.length;
          for (const staffer of staffers) {
            assignedStaffers.add(staffer.name);
          }
        } else {
          unfilledShifts++;
        }
      }

      console.log("=== FINAL SOLUTION SUMMARY ===");
      console.log(
        `Shifts filled: ${this.numShifts - unfilledShifts}/${this.numShifts}`
      );
      console.log(
        `Regular staffers used: ${assignedStaffers.size}/${this.numStaffers}`
      );
      console.log(`Total positions: ${totalPositions}`);
      console.log(`Search calls: ${this.backtrackCallCount}`);

      if (unfilledShifts === 0) {
        console.log("✓ COMPLETE SCHEDULE ACHIEVED!");
      } else {
        console.log(`✗ ${unfilledShifts} shifts remain unfilled`);
      }
    } else {
      console.log("=== NO SOLUTION FOUND ===");
    }
  }

  getDiagnostics() {
    return {
      feasibilityReport: this.feasibilityReport,
      backtrackCallCount: this.backtrackCallCount,
      bestScore: this.bestScore,
      solutionFound: this.solutionFound,
      problemShifts: Array.from(this.problemShifts),
    };
  }
}
