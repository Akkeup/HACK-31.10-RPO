// Browser state contains only server-confirmed values. No scoring or wallet arithmetic.
export class CompetitionClient {
  constructor(adapter, onChange = () => {}) {
    this.adapter = adapter;
    this.onChange = onChange;
    this.online = false;
    this.pending = false;
    this.accepted = null;
    this.generation = 0;
    this.acceptanceRevision = 0;
    this.offReady = adapter.onReady(() =>
      this.recover().catch((error) => {
        this.error = error.message;
        this.changed();
      }),
    );
    this.off = adapter.onEvent((e) => this.event(e));
    this.offStatus = adapter.onStatus((s) => {
      if (s !== "connected") {
        this.online = false;
        this.generation++;
        this.changed();
      }
    });
  }
  changed() {
    this.onChange(this);
  }
  state(value) {
    if (
      this.value?.lobbyId === value.lobbyId &&
      this.value.revision >= value.revision
    )
      return false;
    const differentMatch = this.value?.matchId !== value.matchId;
    if (
      differentMatch ||
      (value.round &&
        this.lastRound?.question.questionId !== value.round.question.questionId)
    ) {
      this.accepted = null;
      this.roundResult = null;
    }
    if (differentMatch) this.lastRound = null;
    if (value.round) this.lastRound = value.round;
    this.value = value;
    return true;
  }
  event(e) {
    const p = e.payload;
    let changed = false;
    if (
      e.type === "activity.changed" &&
      (!this.activity || p.revision > this.activity.revision)
    ) {
      this.activity = p;
      changed = true;
    }
    if (
      e.type === "wallet.updated" &&
      (!this.wallet || p.revision > this.wallet.revision)
    ) {
      this.wallet = p;
      changed = true;
    }
    if (e.type === "competition.state") changed = this.state(p);
    if (e.type === "competition.answer.accepted") {
      this.accepted = p;
      this.acceptanceRevision++;
      changed = true;
    }
    if (
      e.type === "competition.round.closed" &&
      (!this.value || p.matchId === this.value.matchId)
    ) {
      this.roundResult = p;
      changed = true;
    }
    if (
      e.type === "competition.settled" &&
      (!this.value || p.matchId === this.value.matchId)
    ) {
      this.settlement = p;
      changed = true;
      this.recover().catch((error) => {
        this.error = error.message;
        this.changed();
      });
    }
    if (changed) this.changed();
  }
  async recover() {
    const generation = ++this.generation,
      acceptanceRevision = this.acceptanceRevision;
    this.online = false;
    this.changed();
    const activity = await this.adapter.getActivity();
    let match = null,
      state = null;
    if (activity.matchId) match = await this.adapter.getMatch(activity.matchId);
    else if (activity.lobbyId)
      state = await this.adapter.getLobby(activity.lobbyId);
    const wallet = await this.adapter.getWallet();
    if (generation !== this.generation) return;
    if (this.activity && activity.revision < this.activity.revision) {
      if (!this.wallet || wallet.revision >= this.wallet.revision)
        this.wallet = wallet;
      this.online =
        this.adapter.ready && this.adapter.lastStatus === "connected";
      this.changed();
      return;
    }
    this.activity = activity;
    if (match) {
      const canRestore =
        !this.value ||
        (this.value.lobbyId === match.state.lobbyId &&
          this.value.revision <= match.state.revision);
      this.state(match.state);
      if (canRestore && acceptanceRevision === this.acceptanceRevision)
        this.accepted = match.answerAccepted
          ? {
              matchId: match.state.matchId,
              questionId: match.state.round?.question.questionId,
              answer: match.submittedAnswer,
            }
          : null;
    } else if (state) this.state(state);
    if (!this.wallet || wallet.revision >= this.wallet.revision)
      this.wallet = wallet;
    this.online = this.adapter.ready && this.adapter.lastStatus === "connected";
    this.error = null;
    this.changed();
  }
  async send(type, payload, response = ["competition.state"]) {
    if (this.pending || !this.online) return;
    this.pending = true;
    this.error = null;
    this.changed();
    try {
      return await this.adapter.execute(type, payload, response);
    } catch (e) {
      this.error = e.message;
      await this.recover().catch(() => {});
      this.error = e.message;
    } finally {
      this.pending = false;
      this.changed();
    }
  }
  join(tableId) {
    this.accepted = null;
    this.roundResult = null;
    this.settlement = null;
    return this.send("competition.join", { tableId });
  }
  conditions() {
    const s = this.value;
    return {
      tableId: s.tableId,
      lobbyId: s.lobbyId,
      expectedRevision: s.revision,
    };
  }
  configure(subject, stakeAura) {
    return this.send("competition.configure", {
      ...this.conditions(),
      subject,
      stakeAura,
    });
  }
  ready() {
    return this.send("competition.ready", {
      ...this.conditions(),
      ready: true,
    });
  }
  start() {
    return this.send("competition.start", this.conditions());
  }
  answer(answer) {
    const s = this.value;
    return this.send(
      "competition.answer",
      { matchId: s.matchId, questionId: s.round.question.questionId, answer },
      ["competition.answer.accepted"],
    );
  }
  leave() {
    return this.send("competition.leave", { tableId: this.value.tableId }, [
      "activity.changed",
    ]);
  }
  dispose() {
    this.offReady();
    this.off();
    this.offStatus();
    this.generation++;
  }
}
