import type {
  GeneratedLifeEvent,
  NewsSignal,
  ScenarioChoice,
} from "@/types/xtract";

type DirectionGroup = "up" | "down" | "stable";

type ScenarioPreset = Pick<
  GeneratedLifeEvent,
  "title" | "description" | "category" | "choices"
>;

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function textForSignal(signal: NewsSignal) {
  const raw = signal.signal.trim();

  if (!raw) {
    return "The latest public data shows a financially meaningful change.";
  }

  return /[.!?]$/.test(raw) ? raw : `${raw}.`;
}

function combinedSignalText(signal: NewsSignal) {
  return [
    signal.affectedArea,
    signal.topic,
    signal.signal,
    signal.explanation,
    signal.gameRelevance,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function resolveArea(signal: NewsSignal):
  | "insurance"
  | "transportation"
  | "utilities"
  | "housing"
  | "groceries"
  | "borrowing"
  | "debt"
  | "employment"
  | "income"
  | "spending"
  | "budget" {
  const text = combinedSignalText(signal);

  if (
    text.includes("insurance")
  ) {
    return "insurance";
  }

  if (
    text.includes("gasoline") ||
    text.includes("diesel") ||
    text.includes("fuel") ||
    text.includes("transportation") ||
    text.includes("commute")
  ) {
    return "transportation";
  }

  if (
    text.includes("electricity") ||
    text.includes("utility") ||
    text.includes("utilities") ||
    text.includes("natural gas") ||
    text.includes("heating oil") ||
    text.includes("household energy")
  ) {
    return "utilities";
  }

  if (
    text.includes("rent") ||
    text.includes("shelter") ||
    text.includes("housing") ||
    text.includes("apartment") ||
    text.includes("home sale") ||
    text.includes("building permit") ||
    text.includes("residential construction")
  ) {
    return "housing";
  }

  if (
    text.includes("grocery") ||
    text.includes("groceries") ||
    text.includes("food at home") ||
    text.includes("food price")
  ) {
    return "groceries";
  }

  if (
    text.includes("consumer credit") ||
    text.includes("credit card") ||
    text.includes("revolving credit") ||
    text.includes("consumer debt")
  ) {
    return "debt";
  }

  if (
    text.includes("interest rate") ||
    text.includes("federal funds") ||
    text.includes("mortgage") ||
    text.includes("loan") ||
    text.includes("borrowing")
  ) {
    return "borrowing";
  }

  if (
    text.includes("job") ||
    text.includes("employment") ||
    text.includes("unemployment") ||
    text.includes("layoff") ||
    text.includes("hiring") ||
    text.includes("labor market") ||
    text.includes("separation")
  ) {
    return "employment";
  }

  if (
    text.includes("wage") ||
    text.includes("earnings") ||
    text.includes("salary") ||
    text.includes("personal income") ||
    text.includes("disposable income") ||
    text.includes("income")
  ) {
    return "income";
  }

  if (
    text.includes("retail sales") ||
    text.includes("consumer spending") ||
    text.includes("personal consumption") ||
    text.includes("outlays") ||
    text.includes("spending")
  ) {
    return "spending";
  }

  return "budget";
}

function directionFor(
  signal: NewsSignal,
  area: ReturnType<typeof resolveArea>
): DirectionGroup {
  if (signal.direction === "neutral") {
    return "stable";
  }

  if (signal.direction === "decrease") {
    return "down";
  }

  if (signal.direction === "increase") {
    return "up";
  }

  if (signal.direction === "risk") {
    return "down";
  }

  /*
   * "Opportunity" means improving conditions for income/employment.
   * For borrowing, it usually means conditions are becoming more
   * favorable, so treat it like "down" in cost.
   */
  if (signal.direction === "opportunity") {
    if (area === "borrowing" || area === "debt") {
      return "down";
    }

    return "up";
  }

  return "stable";
}

function option(
  text: string,
  consequenceText: string,
  financialEffects: ScenarioChoice["financialEffects"]
): ScenarioChoice {
  return {
    text,
    consequenceText,
    financialEffects,
  };
}

function scenarioFor(
  area: ReturnType<typeof resolveArea>,
  direction: DirectionGroup,
  signal: NewsSignal
): ScenarioPreset {
  const grounded = textForSignal(signal);

  if (area === "insurance") {
    if (direction === "down") {
      return pick([
        {
          title: "Your Insurance Quote Finally Eases",
          description:
            `${grounded} In this simulated scenario, your renewal comes in lower than you expected, giving you a chance to decide what to do with the savings.`,
          category: "Transportation",
          choices: [
            option(
              "Keep the same coverage",
              "You keep your protection and let the lower premium improve your monthly budget.",
              { monthlyExpenses: -28 }
            ),
            option(
              "Add better coverage",
              "You use part of the savings for stronger protection.",
              { monthlyExpenses: -8, emergencyRisk: -4 }
            ),
            option(
              "Bank the difference",
              "You keep the cheaper premium and move extra money into your cushion.",
              { monthlyExpenses: -22, savings: 100 }
            ),
          ],
        },
      ]);
    }

    if (direction === "stable") {
      return {
        title: "Your Insurance Renewal Is Pretty Normal",
        description:
          `${grounded} In this simulated scenario, your renewal is close to what you already pay, so the choice is about risk rather than panic.`,
        category: "Transportation",
        choices: [
          option(
            "Keep the same coverage",
            "You choose predictability.",
            {}
          ),
          option(
            "Raise your deductible",
            "You lower the premium a little but take on more risk.",
            { monthlyExpenses: -18, emergencyRisk: 10 }
          ),
          option(
            "Shop around anyway",
            "Comparison shopping trims the bill slightly.",
            { monthlyExpenses: -12 }
          ),
        ],
      };
    }

    return {
      title: "Your Insurance Renewal Hurts",
      description:
        `${grounded} In this simulated scenario, your renewal notice lands with a higher premium and you need to decide what gives in an already tight month.`,
      category: "Transportation",
      choices: [
        option(
          "Keep the same coverage",
          "Convenient, but the higher bill becomes part of your budget.",
          { monthlyExpenses: 53 }
        ),
        option(
          "Raise your deductible",
          "You lower the premium, but take on more risk if something goes wrong.",
          { monthlyExpenses: 20, emergencyRisk: 12 }
        ),
        option(
          "Shop around",
          "It takes effort, but comparison shopping protects more of your cash flow.",
          { monthlyExpenses: 8 }
        ),
      ],
    };
  }

  if (area === "transportation") {
    if (direction === "up") {
      return pick([
        {
          title: "Your Commute Just Got More Expensive",
          description:
            `${grounded} In this simulated scenario, your weekly fuel bill is starting to crowd out the rest of your budget.`,
          category: "Transportation",
          choices: [
            option(
              "Carpool twice a week",
              "Less solo driving trims your monthly transportation bill.",
              { monthlyExpenses: -45 }
            ),
            option(
              "Keep driving normally",
              "Convenience wins, but fuel takes a bigger bite.",
              { monthlyExpenses: 65 }
            ),
            option(
              "Try public transit",
              "A pass costs money up front, but lowers your recurring commute cost.",
              { savings: -90, monthlyExpenses: -70 }
            ),
          ],
        },
        {
          title: "The Gas Pump Is Eating Your Fun Money",
          description:
            `${grounded} In this simulated scenario, the weekend driving you barely noticed before is now a real budget decision.`,
          category: "Transportation",
          choices: [
            option(
              "Drive less on weekends",
              "You cut optional trips and protect your monthly budget.",
              { monthlyExpenses: -40 }
            ),
            option(
              "Split rides with friends",
              "Sharing fuel costs keeps most of your plans intact.",
              { monthlyExpenses: -25 }
            ),
            option(
              "Change nothing",
              "Your routine stays easy, but your monthly costs rise.",
              { monthlyExpenses: 55 }
            ),
          ],
        },
      ]);
    }

    if (direction === "down") {
      return {
        title: "Cheaper Fuel Frees Up Your Budget",
        description:
          `${grounded} In this simulated scenario, your commute costs less than before and you decide whether the savings disappear into spending or go somewhere useful.`,
        category: "Transportation",
        choices: [
          option(
            "Save the difference",
            "You turn lower fuel costs into a bigger cushion.",
            { savings: 140 }
          ),
          option(
            "Pay down debt",
            "You use the breathing room to shrink a balance.",
            { debt: -140 }
          ),
          option(
            "Spend the extra",
            "The cheaper commute becomes lifestyle creep.",
            { monthlyExpenses: 35 }
          ),
        ],
      };
    }

    return {
      title: "Fuel Costs Are Holding Steady",
      description:
        `${grounded} In this simulated scenario, your transportation budget is predictable for now, so you can plan instead of react.`,
      category: "Transportation",
      choices: [
        option(
          "Keep your routine",
          "No major budget change.",
          {}
        ),
        option(
          "Start carpooling anyway",
          "A small habit creates a little monthly room.",
          { monthlyExpenses: -30 }
        ),
        option(
          "Build a repair fund",
          "You put cash aside before the next car surprise.",
          { savings: 150 }
        ),
      ],
    };
  }

  if (area === "utilities") {
    if (direction === "up") {
      return {
        title: "Your Utility Bill Is Heading the Wrong Way",
        description:
          `${grounded} In this simulated scenario, running your apartment is becoming more expensive each month.`,
        category: "Living costs",
        choices: [
          option(
            "Cut energy use",
            "A few annoying habit changes lower the bill.",
            { monthlyExpenses: -35 }
          ),
          option(
            "Buy a smart thermostat",
            "It costs cash now but helps month after month.",
            { savings: -180, monthlyExpenses: -25 }
          ),
          option(
            "Absorb the bill",
            "Comfort stays the same, but your budget gets tighter.",
            { monthlyExpenses: 60 }
          ),
        ],
      };
    }

    if (direction === "down") {
      return {
        title: "Your Utility Budget Gets Some Breathing Room",
        description:
          `${grounded} In this simulated scenario, lower energy pressure leaves a little more room in your month.`,
        category: "Living costs",
        choices: [
          option(
            "Save the difference",
            "You keep your lifestyle the same and strengthen your cushion.",
            { savings: 120 }
          ),
          option(
            "Pay extra on debt",
            "You redirect the savings toward a balance.",
            { debt: -120 }
          ),
          option(
            "Use more energy",
            "Some of the savings disappear into comfort.",
            { monthlyExpenses: 20 }
          ),
        ],
      };
    }

    return {
      title: "Your Utility Costs Are Pretty Stable",
      description:
        `${grounded} In this simulated scenario, you have enough predictability to make a deliberate budget choice.`,
      category: "Living costs",
      choices: [
        option("Keep things the same", "Your budget stays predictable.", {}),
        option(
          "Trim usage",
          "Small efficiency changes save a little each month.",
          { monthlyExpenses: -20 }
        ),
        option(
          "Build a utility buffer",
          "You keep extra savings ready for a future spike.",
          { savings: 100 }
        ),
      ],
    };
  }

  if (area === "housing") {
    if (direction === "up") {
      return pick([
        {
          title: "Rent Renewal Jumps $175",
          description:
            `${grounded} In this simulated scenario, your landlord renews your lease from $1,450 to $1,625 per month. Moving is expensive too, so there is no effortless choice.`,
          category: "Housing",
          choices: [
            option(
              "Sign the lease",
              "You keep stability, with less room in the monthly budget.",
              { monthlyExpenses: 175 }
            ),
            option(
              "Negotiate the increase",
              "You split the difference, but still pay more each month.",
              { monthlyExpenses: 75 }
            ),
            option(
              "Move to a cheaper apartment",
              "Rent falls, though the move costs cash up front.",
              { monthlyExpenses: -70, savings: -650 }
            ),
          ],
        },
        {
          title: "Your Roommate Is Moving Out",
          description:
            `${grounded} In this simulated scenario, replacing your roommate suddenly matters a lot more because covering the apartment alone would be painful.`,
          category: "Housing",
          choices: [
            option(
              "Find a new roommate",
              "A little hassle protects your monthly budget.",
              { savings: -100 }
            ),
            option(
              "Keep the apartment alone",
              "You get the place to yourself and pay for it.",
              { monthlyExpenses: 420 }
            ),
            option(
              "Downsize",
              "Moving costs hurt now, but the cheaper place helps later.",
              { savings: -800, monthlyExpenses: -110 }
            ),
          ],
        },
      ]);
    }

    if (direction === "down") {
      return {
        title: "You Finally Have Some Renting Leverage",
        description:
          `${grounded} In this simulated scenario, your lease is almost up and the housing backdrop gives you a reason to shop around.`,
        category: "Housing",
        choices: [
          option(
            "Negotiate your renewal",
            "You use the softer market to lower your monthly cost.",
            { monthlyExpenses: -60 }
          ),
          option(
            "Move somewhere better",
            "Moving costs cash, but you upgrade without a huge monthly jump.",
            { savings: -700, monthlyExpenses: 15 }
          ),
          option(
            "Move somewhere cheaper",
            "You turn the opportunity into meaningful monthly savings.",
            { savings: -650, monthlyExpenses: -130 }
          ),
        ],
      };
    }

    return {
      title: "Your Housing Choice Can Wait",
      description:
        `${grounded} In this simulated scenario, conditions are not moving much, so you can make a less rushed decision about your next lease.`,
      category: "Housing",
      choices: [
        option("Renew for one year", "You choose predictability.", {}),
        option(
          "Shop around first",
          "A little effort finds a slightly better deal.",
          { savings: -60, monthlyExpenses: -35 }
        ),
        option(
          "Start a moving fund",
          "You prepare now instead of scrambling later.",
          { savings: 200 }
        ),
      ],
    };
  }

  if (area === "groceries") {
    if (direction === "up") {
      return pick([
        {
          title: "The Grocery Cart Creep",
          description:
            `${grounded} In this simulated scenario, your normal grocery run costs more than it used to. This is becoming a routine budget decision, not a one-time splurge.`,
          category: "Living costs",
          choices: [
            option(
              "Keep your usual routine",
              "You save time, but spend more every month.",
              { monthlyExpenses: 45 }
            ),
            option(
              "Plan meals and switch stores",
              "More planning gives your budget some breathing room.",
              { monthlyExpenses: 15 }
            ),
            option(
              "Use savings for convenience",
              "Your routine stays the same, but the cushion shrinks.",
              { savings: -180 }
            ),
          ],
        },
        {
          title: "Takeout Is Starting to Beat Your Grocery Budget",
          description:
            `${grounded} In this simulated scenario, food costs make convenience meals harder to justify.`,
          category: "Living costs",
          choices: [
            option(
              "Meal prep four nights a week",
              "More work at home cuts your monthly food bill.",
              { monthlyExpenses: -80 }
            ),
            option(
              "Pick up instead of delivery",
              "You keep some convenience while avoiding fees.",
              { monthlyExpenses: -35 }
            ),
            option(
              "Keep ordering",
              "Convenience wins, and the food budget climbs.",
              { monthlyExpenses: 65 }
            ),
          ],
        },
      ]);
    }

    if (direction === "down") {
      return {
        title: "Food Prices Give Your Budget a Break",
        description:
          `${grounded} In this simulated scenario, your normal food budget has a little more room than before.`,
        category: "Living costs",
        choices: [
          option(
            "Save the difference",
            "You turn lower food pressure into a bigger cushion.",
            { savings: 100 }
          ),
          option(
            "Pay down debt",
            "You redirect the savings toward a balance.",
            { debt: -100 }
          ),
          option(
            "Upgrade your groceries",
            "You spend some of the relief on better food.",
            { monthlyExpenses: 25 }
          ),
        ],
      };
    }

    return {
      title: "Your Grocery Budget Is Holding Steady",
      description:
        `${grounded} In this simulated scenario, predictable food costs give you a chance to plan instead of react.`,
      category: "Living costs",
      choices: [
        option("Keep your routine", "No major change.", {}),
        option(
          "Meal prep anyway",
          "You create a little extra room in the month.",
          { monthlyExpenses: -35 }
        ),
        option(
          "Move $100 to savings",
          "You use the stability to strengthen your cushion.",
          { savings: 100 }
        ),
      ],
    };
  }

  if (area === "borrowing") {
    if (direction === "up") {
      return pick([
        {
          title: "The Car Loan Quote Just Got Worse",
          description:
            `${grounded} In this simulated scenario, you were planning to replace your car, but financing deserves another look.`,
          category: "Credit",
          choices: [
            option(
              "Finance it anyway",
              "You get the car now, along with a payment that follows you.",
              { savings: -1200, debt: 9500, monthlyExpenses: 245 }
            ),
            option(
              "Save a bigger down payment",
              "More pain now means less borrowing later.",
              { savings: -2200, debt: 6500, monthlyExpenses: 165 }
            ),
            option(
              "Repair your current car",
              "You buy yourself time and avoid a new loan.",
              { savings: -650 }
            ),
          ],
        },
        {
          title: "Your Starter-Condo Math Just Changed",
          description:
            `${grounded} In this simulated scenario, the small condo you have been watching suddenly looks harder to finance.`,
          category: "Housing",
          choices: [
            option(
              "Keep renting",
              "You wait instead of stretching your budget.",
              {}
            ),
            option(
              "Increase your down-payment fund",
              "You delay the purchase and strengthen your position.",
              { savings: 400 }
            ),
            option(
              "Buy anyway",
              "You force the purchase and take on a much tighter monthly budget.",
              { savings: -3000, debt: 18000, monthlyExpenses: 280 }
            ),
          ],
        },
      ]);
    }

    if (direction === "down") {
      return pick([
        {
          title: "Refinancing Is Back on the Table",
          description:
            `${grounded} In this simulated scenario, you check whether an old balance can be made less painful.`,
          category: "Credit",
          choices: [
            option(
              "Refinance",
              "A small fee improves your monthly debt burden.",
              { savings: -150, debt: -600, monthlyExpenses: -35 }
            ),
            option(
              "Pay extra instead",
              "You skip the paperwork and attack principal.",
              { savings: -500, debt: -500 }
            ),
            option(
              "Leave it alone",
              "Nothing changes.",
              {}
            ),
          ],
        },
        {
          title: "Your Auto-Loan Options Just Improved",
          description:
            `${grounded} In this simulated scenario, the used car you have been watching is easier to finance than before.`,
          category: "Credit",
          choices: [
            option(
              "Finance the car",
              "You use the better borrowing conditions and take on a payment.",
              { savings: -1500, debt: 8200, monthlyExpenses: 190 }
            ),
            option(
              "Put more money down",
              "You reduce the balance and the monthly payment.",
              { savings: -2800, debt: 5200, monthlyExpenses: 125 }
            ),
            option(
              "Keep saving",
              "You wait and strengthen your eventual down payment.",
              { savings: 150 }
            ),
          ],
        },
      ]);
    }

    return {
      title: "The Loan Offer Changed, But Not by Much",
      description:
        `${grounded} In this simulated scenario, you are considering a purchase on credit while borrowing conditions are fairly steady.`,
      category: "Credit",
      choices: [
        option(
          "Wait and save longer",
          "You delay the purchase and avoid taking on a new payment.",
          { savings: 150 }
        ),
        option(
          "Take the financing offer",
          "You get it now, but add a payment to your month.",
          { monthlyExpenses: 85, debt: 1800 }
        ),
        option(
          "Choose the lower-cost option",
          "A compromise keeps your debt exposure lower.",
          { monthlyExpenses: 35, debt: 700 }
        ),
      ],
    };
  }

  if (area === "debt") {
    if (direction === "up") {
      return pick([
        {
          title: "Your Credit Balance Deserves Attention",
          description:
            `${grounded} In this simulated scenario, the broader credit signal makes you look at your own revolving balance more carefully.`,
          category: "Credit",
          choices: [
            option(
              "Pay down $600",
              "Your cash cushion shrinks, but so does the balance.",
              { savings: -600, debt: -600 }
            ),
            option(
              "Split cash and debt",
              "You make progress without draining your cushion.",
              { savings: -300, debt: -300 }
            ),
            option(
              "Keep minimum payments",
              "You keep more cash today, but the balance lingers.",
              { debt: 120 }
            ),
          ],
        },
        {
          title: "Buy Now, Pay Later Is Tempting You",
          description:
            `${grounded} In this simulated scenario, easy credit makes a new laptop feel cheaper than it really is.`,
          category: "Credit",
          choices: [
            option(
              "Buy it on credit",
              "The laptop is yours, along with another balance.",
              { debt: 900, monthlyExpenses: 80 }
            ),
            option(
              "Save and wait",
              "You start a purchase fund instead of opening another balance.",
              { savings: 250 }
            ),
            option(
              "Buy used in cash",
              "Less shiny, no new debt.",
              { savings: -450 }
            ),
          ],
        },
      ]);
    }

    if (direction === "down") {
      return {
        title: "You Have a Chance to Clean Up Your Debt",
        description:
          `${grounded} In this simulated scenario, you use the calmer credit backdrop as a reason to simplify your balances.`,
        category: "Credit",
        choices: [
          option(
            "Pay off a small balance",
            "One monthly obligation disappears.",
            { savings: -400, debt: -400 }
          ),
          option(
            "Build cash instead",
            "You prioritize liquidity.",
            { savings: 150 }
          ),
          option(
            "Split the difference",
            "You improve both sides slowly.",
            { savings: -200, debt: -200 }
          ),
        ],
      };
    }

    return {
      title: "Your Credit Plan Needs Discipline, Not Panic",
      description:
        `${grounded} In this simulated scenario, conditions are not moving dramatically, so your own habits matter more than the headline.`,
      category: "Credit",
      choices: [
        option(
          "Autopay extra principal",
          "A slightly bigger payment steadily cuts the balance.",
          { monthlyExpenses: 45, debt: -180 }
        ),
        option(
          "Build emergency savings",
          "You set money aside so the next surprise does not land on a card.",
          { savings: 200 }
        ),
        option(
          "Keep minimum payments",
          "Your budget stays comfortable, but progress stays slow.",
          {}
        ),
      ],
    };
  }

  if (area === "employment") {
    if (direction === "down") {
      return pick([
        {
          title: "Layoffs Hit Your Industry",
          description:
            `${grounded} In this simulated scenario, several companies in your field announce cuts. Your employer has not laid you off, but the uncertainty is real.`,
          category: "Career",
          choices: [
            option(
              "Keep working normally",
              "You avoid disruption, but have no backup plan if conditions worsen.",
              {}
            ),
            option(
              "Start job hunting",
              "You invest time now and eventually find a role with better pay.",
              { monthlyIncome: 180 }
            ),
            option(
              "Spend $800 on a certification",
              "The course builds resilience, but costs savings today.",
              { savings: -800, monthlyIncome: 110 }
            ),
          ],
        },
        {
          title: "Your Team Freezes New Hiring",
          description:
            `${grounded} In this simulated scenario, nobody on your team is gone yet, but advancement suddenly looks harder.`,
          category: "Career",
          choices: [
            option(
              "Start networking",
              "You build options before you need them.",
              { savings: -60 }
            ),
            option(
              "Build an emergency fund",
              "You prepare for uncertainty.",
              { savings: 250 }
            ),
            option(
              "Keep your head down",
              "You protect the job you already have.",
              {}
            ),
          ],
        },
      ]);
    }

    if (direction === "up") {
      return pick([
        {
          title: "A Recruiter Just Landed in Your Inbox",
          description:
            `${grounded} In this simulated scenario, the labor backdrop makes a career move feel more realistic.`,
          category: "Career",
          choices: [
            option(
              "Take the interview",
              "The search pays off with a stronger offer.",
              { savings: -50, monthlyIncome: 200 }
            ),
            option(
              "Use it as raise leverage",
              "Your current employer moves a little.",
              { monthlyIncome: 120 }
            ),
            option(
              "Ignore it",
              "You keep the stability you already have.",
              {}
            ),
          ],
        },
        {
          title: "A Better Job Market Puts You in Play",
          description:
            `${grounded} In this simulated scenario, you decide whether to test your value while opportunities look better.`,
          category: "Career",
          choices: [
            option(
              "Apply aggressively",
              "The search takes effort but produces a stronger offer.",
              { savings: -80, monthlyIncome: 240 }
            ),
            option(
              "Ask for a raise",
              "Your employer pays more to keep you.",
              { monthlyIncome: 150 }
            ),
            option(
              "Stay comfortable",
              "You keep your current job.",
              {}
            ),
          ],
        },
      ]);
    }

    return {
      title: "The Job Market Is Holding Steady",
      description:
        `${grounded} In this simulated scenario, you do not have a strong reason to panic or jump ship, so the decision is mostly yours.`,
      category: "Career",
      choices: [
        option(
          "Stay at your current job",
          "You choose stability while you watch the market.",
          {}
        ),
        option(
          "Apply selectively",
          "You test the market without rushing.",
          { savings: -50, monthlyIncome: 80 }
        ),
        option(
          "Build your skills",
          "You prepare for the next opportunity.",
          { savings: -300, monthlyIncome: 45 }
        ),
      ],
    };
  }

  if (area === "income") {
    if (direction === "up") {
      return pick([
        {
          title: "Your Industry Is Paying More",
          description:
            `${grounded} In this simulated scenario, your annual review is coming up and you have a reason to think harder about your pay.`,
          category: "Career",
          choices: [
            option(
              "Ask for a raise",
              "You make the case and improve your monthly income.",
              { monthlyIncome: 160 }
            ),
            option(
              "Apply elsewhere",
              "The search is work, but a new offer increases your pay.",
              { monthlyIncome: 250 }
            ),
            option(
              "Stay quiet",
              "You keep the stability you have for now.",
              {}
            ),
          ],
        },
        {
          title: "You Finally Have Room to Automate Savings",
          description:
            `${grounded} In this simulated scenario, a stronger income picture gives you a chance to decide where the extra room should go.`,
          category: "Money",
          choices: [
            option(
              "Automate savings",
              "You turn extra income into a habit.",
              { savings: 180 }
            ),
            option(
              "Pay down debt",
              "You use the stronger cash flow to shrink a balance.",
              { debt: -250 }
            ),
            option(
              "Upgrade your lifestyle",
              "Your spending rises right along with your income.",
              { monthlyExpenses: 90 }
            ),
          ],
        },
      ]);
    }

    if (direction === "down") {
      return {
        title: "Your Income Cushion Feels Thinner",
        description:
          `${grounded} In this simulated scenario, you decide whether to prepare for a tighter few months.`,
        category: "Career",
        choices: [
          option(
            "Cut subscriptions",
            "A few small cuts improve monthly breathing room.",
            { monthlyExpenses: -45 }
          ),
          option(
            "Start a side gig",
            "You trade free time for a second income stream.",
            { savings: -100, monthlyIncome: 140 }
          ),
          option(
            "Do nothing",
            "You keep the same budget and hope your income holds.",
            {}
          ),
        ],
      };
    }

    return {
      title: "Your Paycheck Outlook Is Pretty Steady",
      description:
        `${grounded} In this simulated scenario, no major income swing means your next move is mostly about your own habits.`,
      category: "Career",
      choices: [
        option(
          "Increase savings",
          "You strengthen your cushion.",
          { savings: 180 }
        ),
        option(
          "Pay down debt",
          "You turn stability into progress.",
          { debt: -180 }
        ),
        option(
          "Keep your routine",
          "Nothing changes.",
          {}
        ),
      ],
    };
  }

  if (area === "spending") {
    if (direction === "up") {
      return pick([
        {
          title: "Everyone Is Spending, Including You",
          description:
            `${grounded} In this simulated scenario, your own card statement is starting to look a little too much like the broader spending trend.`,
          category: "Spending",
          choices: [
            option(
              "Set a weekly cap",
              "A simple limit pulls your spending back down.",
              { monthlyExpenses: -75 }
            ),
            option(
              "Keep the same habits",
              "Your lifestyle slowly gets more expensive.",
              { monthlyExpenses: 45 }
            ),
            option(
              "Cash-only weekends",
              "A little friction makes impulse spending harder.",
              { monthlyExpenses: -40 }
            ),
          ],
        },
        {
          title: "Weekend Shifts Are Back on the Schedule",
          description:
            `${grounded} In this simulated scenario, your consumer-facing employer offers extra weekend hours.`,
          category: "Career",
          choices: [
            option(
              "Take the shifts",
              "Less free time, more monthly income.",
              { monthlyIncome: 170 }
            ),
            option(
              "Take one shift",
              "You split the difference.",
              { monthlyIncome: 85 }
            ),
            option(
              "Protect your weekend",
              "No extra cash, no burnout.",
              {}
            ),
          ],
        },
      ]);
    }

    if (direction === "down") {
      return {
        title: "Your Employer Cuts Back on Extra Hours",
        description:
          `${grounded} In this simulated scenario, business is quieter and the easy overtime you counted on is disappearing.`,
        category: "Career",
        choices: [
          option(
            "Find a side gig",
            "You replace some of the lost opportunity elsewhere.",
            { savings: -80, monthlyIncome: 120 }
          ),
          option(
            "Trim your budget",
            "You respond by lowering monthly spending.",
            { monthlyExpenses: -90 }
          ),
          option(
            "Ride it out",
            "You keep your routine and accept less monthly income.",
            { monthlyIncome: -60 }
          ),
        ],
      };
    }

    return {
      title: "Consumer Spending Is Not Giving You a Clear Signal",
      description:
        `${grounded} In this simulated scenario, you focus on your own budget instead of chasing a broad trend.`,
      category: "Spending",
      choices: [
        option(
          "Audit your subscriptions",
          "You find a few charges you stopped noticing.",
          { monthlyExpenses: -35 }
        ),
        option("Keep your budget", "No change.", {}),
        option(
          "Build a fun-money limit",
          "You keep room for spending without letting it drift.",
          { monthlyExpenses: -25 }
        ),
      ],
    };
  }

  /*
   * General inflation / everyday budget.
   */
  if (direction === "up") {
    return pick([
      {
        title: "Your Monthly Budget Needs a Reset",
        description:
          `${grounded} In this simulated scenario, the everyday costs you counted on are squeezing the margin you used to have.`,
        category: "Cost of living",
        choices: [
          option(
            "Cut flexible spending",
            "You protect essentials by trimming social and convenience spending.",
            { monthlyExpenses: -45 }
          ),
          option(
            "Keep your routine",
            "Nothing changes today, but the monthly gap becomes real.",
            { monthlyExpenses: 70 }
          ),
          option(
            "Build a tighter grocery and transit plan",
            "More effort now helps preserve your emergency cushion.",
            { monthlyExpenses: -30, savings: 50 }
          ),
        ],
      },
      {
        title: "Inflation Is Eating the Margin in Your Budget",
        description:
          `${grounded} In this simulated scenario, several ordinary costs are moving against you at once.`,
        category: "Cost of living",
        choices: [
          option(
            "Cut subscriptions",
            "You make room without touching essentials.",
            { monthlyExpenses: -45 }
          ),
          option(
            "Ask for more hours",
            "You solve part of the squeeze by earning more.",
            { monthlyIncome: 110 }
          ),
          option(
            "Use savings",
            "Your lifestyle stays the same, but your cushion does not.",
            { savings: -300 }
          ),
        ],
      },
    ]);
  }

  if (direction === "down") {
    return {
      title: "Price Pressure Finally Gives You Some Room",
      description:
        `${grounded} In this simulated scenario, your everyday budget has a little more room than before.`,
      category: "Cost of living",
      choices: [
        option(
          "Save the difference",
          "You turn the relief into a bigger cushion.",
          { savings: 125 }
        ),
        option(
          "Pay down debt",
          "You use the breathing room to make progress.",
          { debt: -150 }
        ),
        option(
          "Spend a little more",
          "Some of the relief becomes lifestyle spending.",
          { monthlyExpenses: 35 }
        ),
      ],
    };
  }

  return {
    title: "Everyday Costs Are Holding Pretty Steady",
    description:
      `${grounded} In this simulated scenario, your monthly budget is more predictable for now.`,
    category: "Cost of living",
    choices: [
      option("Keep the same budget", "You stay consistent.", {}),
      option(
        "Increase savings",
        "You take advantage of the calmer month.",
        { savings: 150 }
      ),
      option(
        "Pay down debt",
        "You use stability to reduce a balance.",
        { debt: -150 }
      ),
    ],
  };
}

export function generateScenario(
  signal: NewsSignal
): GeneratedLifeEvent {
  const area = resolveArea(signal);
  const direction = directionFor(signal, area);
  const preset = scenarioFor(area, direction, signal);

  return {
    id: `scenario-${signal.id}`,
    ...preset,
    ageRange: [22, 30],
    newsSignalId: signal.id,
    sourceAttribution: {
      headline: signal.headline,
      sourceName: signal.sourceName,
      sourceUrl: signal.sourceUrl,
      publishedAt: signal.publishedAt,
      evidence: signal.evidence,
    },
  };
}
