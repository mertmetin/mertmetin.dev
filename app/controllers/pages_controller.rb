class PagesController < ApplicationController
  def home
    @projects = Project.all
    @posts = Post.all.first(3)
  end
end
