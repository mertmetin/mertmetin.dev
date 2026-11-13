require "application_system_test_case"

# Browser tests for the JavaScript parts of the home page.
class HomeTest < ApplicationSystemTestCase
  def terminal(command)
    find("#terminal-input").set(command).send_keys(:enter)
  end

  test "terminal answers commands, suggests fixes for typos and escapes input" do
    visit root_path
    terminal "hey"
    assert_text "thanks for stopping by"

    terminal "cat rabbit"
    assert_text "Grocery delivery in Ottawa"

    terminal "lss"
    assert_text "did you mean ls?"

    terminal "<img src=x onerror=alert(1)>"
    assert_text "command not found: <img"
    assert_no_selector "[data-terminal-target=output] img"
  end

  test "cd into a project opens its page" do
    visit root_path
    terminal "cd searchbench"
    assert_current_path project_path("searchbench")
    assert_selector "h1", text: "searchbench"
  end

  test "Rabbit Run starts from the terminal and quits back to it" do
    visit root_path
    terminal "play"
    assert_selector "[data-terminal-target=game]", visible: true
    find("body").send_keys(:escape)
    assert_text "game quit."
  end

  test "Bug Hunt round starts and bugs can be squashed" do
    visit root_path(anchor: "play")
    click_on "Start bug hunt"
    bug = find("#play .bug", match: :first, wait: 5)
    bug.click
    assert_selector "[data-bug-hunt-target=score]", text: /[1-9]/
  end

  test "AI lab trains the neural-net brain" do
    visit root_path(anchor: "lab")
    click_on "Neural net"
    click_on "Turbo"
    click_on "▶ Train"
    assert_selector "[data-rabbit-lab-target=episode]", text: /\A[1-9]\d*\z/, wait: 10
    assert_text "network 41→64→3"
  end
end
