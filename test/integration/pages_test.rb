require "test_helper"

class PagesTest < ActionDispatch::IntegrationTest
  test "home lists every project with a link to its page" do
    get root_path
    assert_response :success
    assert_select "h1", /I build software/
    Project.all.each do |project|
      assert_select "a[href=?]", project_path(project), text: /#{Regexp.escape(project.name)}/
    end
  end

  test "each project page renders its highlights and code links" do
    Project.all.each do |project|
      get project_path(project)
      assert_response :success
      assert_select "h1", project.name
      assert_select "li", text: project.highlights.first
      project.links.each { |link| assert_select "a[href=?]", link.url }
    end
  end

  test "private projects say so instead of showing links" do
    get project_path("real-estate")
    assert_select "p", /Private/
  end

  test "unknown project is a 404" do
    get project_path("nope")
    assert_response :not_found
  end
end
