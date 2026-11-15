class PagesController < ApplicationController
  def home
    @projects = Project.all
    @posts = Post.all.first(3)
  end

  def sitemap
    @paths = [ root_path, posts_path ] +
      Project.all.map { project_path(_1) } +
      Post.all.map { post_path(_1) }
  end
end
