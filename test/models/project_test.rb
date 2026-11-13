require "test_helper"

class ProjectTest < ActiveSupport::TestCase
  test "every project in config/projects.yml loads" do
    assert_operator Project.all.size, :>=, 4
    assert Project.all.all? { _1.links.all? { |l| l.url.start_with?("https://") } }
  end

  test "links must be https" do
    assert_raises(ArgumentError) { Project::Link.new(label: "x", url: "javascript:alert(1)") }
    assert_raises(ArgumentError) { Project::Link.new(label: "x", url: "http://example.com") }
    assert_equal "https://github.com/mertmetin", Project::Link.new(label: "x", url: "https://github.com/mertmetin").url
  end
end
