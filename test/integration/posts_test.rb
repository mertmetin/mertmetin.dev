require "test_helper"

class PostsTest < ActionDispatch::IntegrationTest
  test "writing index lists every post" do
    get posts_path
    assert_response :success
    Post.all.each { |post| assert_select "a[href=?]", post_path(post), text: /#{Regexp.escape(post.title)}/ }
  end

  test "each post renders its Markdown" do
    Post.all.each do |post|
      get post_path(post)
      assert_response :success
      assert_select "h1", post.title
      assert_select ".prose-post h2"
    end
  end

  test "home shows the latest posts" do
    get root_path
    assert_select "#writing a[href=?]", post_path(Post.all.first)
  end

  test "unknown post is a 404" do
    get post_path("nope")
    assert_response :not_found
  end
end

class PostTest < ActiveSupport::TestCase
  test "raw HTML in a post is not rendered" do
    post = Post.new(slug: "x", title: "x", date: Date.current, summary: "x", body: "<script>alert(1)</script>\n\nhi")
    assert_not_includes post.html, "<script>"
    assert_includes post.html, "hi"
  end
end
