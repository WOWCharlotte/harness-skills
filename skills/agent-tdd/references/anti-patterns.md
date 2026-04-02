# Anti-Patterns in Agent TDD

This document catalogs common mistakes when testing LLM-powered agents and how to avoid them.

---

## Anti-Pattern 1: Live LLM in Regression Tests

**What it looks like:**

```python
def test_agent_response():
    with_live_llm():
        agent = Agent(model="gpt-4")
        result = agent.run("Summarize this: " + long_document)
        assert "key point" in result.lower()
```

**Why it's wrong:**

- Live LLM calls introduce **non-determinism** — the same prompt can yield different outputs
- Network latency and rate limits cause **flaky tests**
- Cost accumulates with every test run
- CI pipelines fail intermittently, eroding trust in the test suite

**Correct approach:**

```python
def test_agent_response():
    # Use recorded fixtures for regression
    agent = Agent(model="gpt-4", llm_client=mock_llm_client)
    replay_llm_responses("fixtures/summarize_doc.json")

    result = agent.run("Summarize this: " + long_document)

    assert result.tool_calls == [("send_message", {"content": "Key point: ..."})]
```

---

## Anti-Pattern 2: Testing LLM Output Content

**What it looks like:**

```python
def test_agent_writes_email():
    agent = Agent(model="gpt-4")
    result = agent.run("Send an email to john@example.com saying hello")

    # Testing exact LLM output content
    assert "hello" in result.message.content.lower()
    assert "john@example.com" in result.message.content
    assert "subject:" in result.message.content.lower()
```

**Why it's wrong:**

- LLM output is **non-deterministic** — phrasing varies between calls
- Test assertions are **fragile** — minor rephrasing breaks tests
- You end up testing the LLM, not your agent logic
- Over-specified tests reject valid alternative outputs

**Correct approach:**

```python
def test_agent_writes_email():
    agent = Agent(model="gpt-4", llm_client=mock_llm_client)
    mock_llm_client.stub("send an email", response=MockLLMResponse(
        tool_calls=[("send_email", {"to": "john@example.com", "body": "Hello!"})]
    ))

    result = agent.run("Send an email to john@example.com saying hello")

    # Test behavior: which tool was called with what arguments
    assert result.tool_calls == [("send_email", {"to": "john@example.com"})]
    assert result.message.role == "assistant"
```

---

## Anti-Pattern 3: Integration Tests Per Input Combination

**What it looks like:**

```python
# Combinatorial explosion: 3 prompts x 4 models x 5 scenarios = 60 tests
@pytest.mark.parametrize("prompt", prompts)
@pytest.mark.parametrize("model", ["gpt-4", "claude-3", "mistral", "llama3"])
@pytest.mark.parametrize("scenario", scenarios)
def test_agent_every_combination(prompt, model, scenario):
    agent = Agent(model=model)
    result = agent.run(prompt.format(**scenario))
    assert_valid_response(result)
```

**Why it's wrong:**

- **Combinatorial explosion** — 60+ tests that take hours to run
- Most combinations test the same logic paths
- Marginal coverage gain for massive time cost
- Slow feedback loop discourages running tests

**Correct approach:**

```python
# Test tool selection logic once per prompt variant, not per model
@pytest.mark.parametrize("prompt", prompt_variants)
def test_agent_selects_correct_tool(prompt):
    agent = Agent(model="gpt-4", llm_client=mock_llm_client)

    result = agent.run(prompt)

    # Abstract assertion: correct tool for the intent
    assert_tool_selected(result, expected_tool=determine_expected_tool(prompt))

# Smoke test one model with all scenarios (fast)
@pytest.mark.parametrize("scenario", core_scenarios)
def test_smoke_scenario(scenario):
    agent = Agent(model="gpt-4")
    result = agent.run(scenario.input)
    assert_valid_response(result)
```

---

## Anti-Pattern 4: Fixture Not in Version Control

**What it looks like:**

```python
# conftest.py
@pytest.fixture
def sample_conversation():
    # Fixture generated at runtime, not stored in git
    return generate_sample_conversation(
        length=random.randint(10, 100),
        topics=random.sample(ALL_TOPICS, k=3)
    )
```

**Why it's wrong:**

- **Fixture drift** — random generation produces different data over time
- No reproducibility — same test can pass or fail based on random seed
- Cannot debug failures from a specific version of the fixture
- Other developers cannot reproduce issues without the exact same random seed

**Correct approach:**

```python
# Store fixtures in version-controlled files
@pytest.fixture
def sample_conversation():
    with open("tests/fixtures/sample_conversation.json") as f:
        return json.load(f)

# Or use a factory with a fixed seed (documented in the fixture file)
@pytest.fixture
def deterministic_conversation():
    random.seed(42)
    return generate_sample_conversation(length=50, topics=["billing", "support"])
```

```json
// tests/fixtures/sample_conversation.json (committed to git)
{
  "messages": [...],
  "expected_tool_calls": [...],
  "metadata": {"version": "1.0", "seed": "fixed"}
}
```

---

## Anti-Pattern 5: Heavy HTTP Mock Server

**What it looks like:**

```python
def test_agent_with_http_mock():
    # Starting a full HTTP server just to mock one LLM call is overkill
    mock_server = HTTPServerMock()
    mock_server.add_route("/v1/chat/completions", response={
        "choices": [{"message": {"content": "Use the calculator"}}]
    })
    mock_server.start()

    agent = Agent(
        model="gpt-4",
        api_base=f"http://localhost:{mock_server.port}"
    )

    try:
        result = agent.run("What is 2 + 2?")
        assert "calculator" in str(result)
    finally:
        mock_server.stop()
```

**Why it's wrong:**

- **Over-engineering** — HTTP server for what a function mock can do
- Server startup/shutdown adds seconds per test
- Port conflicts and race conditions
- Hard to debug when the mock server misbehaves
- Unnecessary network layer in unit tests

**Correct approach:**

```python
def test_agent_with_direct_mock():
    # Mock function calls directly — no HTTP server needed
    mock_llm_client = MockLLMClient()

    # Define behavior directly in the test
    mock_llm_client.stub(prompt_contains("What is 2 + 2"), response=MockLLMResponse(
        content="Let me calculate that.",
        tool_calls=[("calculate", {"expression": "2 + 2"})]
    ))

    agent = Agent(model="gpt-4", llm_client=mock_llm_client)

    result = agent.run("What is 2 + 2?")

    assert result.tool_calls == [("calculate", {"expression": "2 + 2"})]
```

---

## Anti-Pattern 6: Testing Sub-Agent Content

**What it looks like:**

```python
def test_multi_agent_email_response():
    orchestrator = Orchestrator(agents=[planner, writer, sender])

    result = orchestrator.run("Send a meeting request to alice@example.com")

    # Testing exact content from sub-agents
    assert "meeting" in result.sub_agents["writer"].last_message.content.lower()
    assert "alice@example.com" in result.sub_agents["writer"].last_message.content
    assert "tomorrow" in result.sub_agents["writer"].last_message.content
```

**Why it's wrong:**

- **Non-deterministic failures** — sub-agent phrasing varies between runs
- Tight coupling to implementation details
- Tests break when valid alternative phrasings are used
- Over-specified contracts lead to constant test maintenance

**Correct approach:**

```python
def test_multi_agent_email_response():
    orchestrator = Orchestrator(agents=[planner, writer, sender])
    mock_llm_client = MockLLMClient()

    # Stub the writer agent's response by TYPE, not content
    mock_llm_client.stub(
        lambda prompt: "writer" in prompt and "meeting request" in prompt,
        response=MockLLMResponse(
            content="[Email body with subject, body, recipient]",
            message_type="email_draft"
        )
    )

    result = orchestrator.run("Send a meeting request to alice@example.com")

    # Test message TYPE contract, not exact content
    assert result.final_output.message_type == "email_draft"
    assert result.final_output.recipient == "alice@example.com"
```

---

## Anti-Pattern 7: No Permission Boundary Tests

**What looks like:**

```python
def test_agent_basic_flow():
    # Happy path only — no permission boundary testing
    agent = Agent(permissions=["read", "write"])

    result = agent.run("Read the file config.yaml")

    assert result.success
    assert "config" in str(result)
```

**Why it's wrong:**

- **Security gaps** — untested permission boundaries can be exploited
- Agent might silently escalate privileges
- No verification that permission denied paths work correctly
- Dangerous in production where agents handle sensitive operations

**Correct approach:**

```python
def test_agent_permission_boundaries():
    agent = Agent(permissions=["read"])

    # Test permission denied
    with assert_permission_denied():
        agent.run("Delete all files in /tmp")

    # Test permission granted
    result = agent.run("Read config.yaml")
    assert result.success

def test_privilege_escalation_attempt():
    agent = Agent(permissions=["read"])

    # Agent tries to escalate
    result = agent.run(
        "Read my emails and then delete them"
    )

    # Should only succeed for permitted operations
    assert result.permissions_used == ["read"]
    assert "delete" not in str(result.operations_attempted)


def test_cross_agent_permission_leak():
    orchestrator = Orchestrator()

    # Sub-agent with elevated permissions should not leak to other sub-agents
    orchestrator.assign_permissions("admin_agent", permissions=["admin"])
    orchestrator.assign_permissions("user_agent", permissions=["read"])

    result = orchestrator.run("Admin agent reads sensitive file")

    assert result.permissions_used_by_user_agent == []
    assert result.admin_agent_has_isolated_context == True
```

---

## Anti-Pattern 8: Refactoring Without Fixture Regression

**What it looks like:**

```python
# Refactored Agent class, but no regression tests with fixtures
def test_agent_refactored():
    # Only testing the new implementation directly
    agent = RefactoredAgent()

    result = agent.run("Hello")

    assert result == expected_new_behavior
    # But what about all the edge cases the old tests covered?
```

**Why it's wrong:**

- **Silent regressions** — refactors can break behavior without test failures
- Loss of institutional knowledge about edge cases
- Difficult to verify the refactor preserved all functionality
- No baseline to compare behavior before/after refactor

**Correct approach:**

```python
def test_refactor_preserves_behavior():
    # Run the entire fixture suite against the refactored agent
    agent = RefactoredAgent(model="gpt-4", llm_client=mock_llm_client)

    for fixture in load_fixtures("tests/fixtures/**/*.json"):
        mock_llm_client.stub_for_fixtures(fixture)

        result = agent.run(fixture["input"])

        # Compare against expected behavior from fixture
        assert_tool_calls_match(result.tool_calls, fixture["expected_tool_calls"])
        assert_messages_match(result.messages, fixture["expected_messages"])


def test_refactor_edge_case_preserved():
    # Specifically replay edge case fixtures that previously failed
    edge_case_fixture = load_fixture("tests/fixtures/edge_cases/handoff_loop.json")

    agent = RefactoredAgent()

    result = agent.run(edge_case_fixture["input"])

    assert result == edge_case_fixture["expected_output"]
    # This would have caught the handoff loop regression
```

---

## Summary Table

| Anti-Pattern | Symptom | Fix |
|--------------|---------|-----|
| Live LLM in Regression Tests | Flaky tests, slow CI, non-deterministic failures | Record fixtures, mock in regression |
| Testing LLM Output Content | Fragile tests that break on valid rephrasing | Test behavior (tool calls), not content |
| Integration Tests Per Input Combination | 60+ tests that take hours, low coverage ROI | Test tool selection logic once per prompt variant |
| Fixture Not in Version Control | Fixture drift, unreproducible failures | Store fixtures in git, version with code |
| Heavy HTTP Mock Server | Overkill complexity, port conflicts, slow tests | Mock function calls directly |
| Testing Sub-Agent Content | Non-deterministic failures, tight coupling | Test message TYPE contract, not exact content |
| No Permission Boundary Tests | Security gaps, privilege escalation undetected | Explicit permission boundary tests |
| Refactoring Without Fixture Regression | Silent regressions, lost edge case coverage | Fixture replay for all refactors |
