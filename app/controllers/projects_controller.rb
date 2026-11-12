class ProjectsController < ApplicationController
  def show
    @project = Project.find(params[:slug])
  end
end
