Rails.application.routes.draw do
  root "pages#home"
  resources :projects, only: :show, param: :slug
  resources :posts, path: "writing", only: %i[index show], param: :slug

  # Health check for the load balancer / Kamal.
  get "up" => "rails/health#show", as: :rails_health_check
end
