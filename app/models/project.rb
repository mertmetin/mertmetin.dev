# A portfolio project. The content lives in config/projects.yml; there's no
# database table yet, but the interface matches what an Active Record model
# would give the views, so it can move to the database later.
class Project
  Link = Data.define(:label, :url)

  ATTRIBUTES = %i[slug name tagline year stat stat_label summary highlights stack].freeze
  attr_reader(*ATTRIBUTES, :links)

  def self.all
    @all ||= YAML.load_file(Rails.root.join("config/projects.yml")).map { new(**_1.symbolize_keys) }.freeze
  end

  def self.find(slug)
    all.find { _1.slug == slug } or raise ActiveRecord::RecordNotFound, "No project #{slug}"
  end

  def initialize(links: [], private: false, **attrs)
    ATTRIBUTES.each { instance_variable_set("@#{_1}", attrs.fetch(_1)) }
    @links = links.map { Link.new(**_1.symbolize_keys) }
    @private = private
  end

  def private? = @private
  def to_param = slug
end
